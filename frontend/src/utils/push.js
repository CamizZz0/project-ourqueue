import api from "./api";

const SW_URL = "/sw.js";
const SW_READY_TIMEOUT_MS = 15000;

// participant_token yang terakhir dipakai, supaya service worker bisa minta
// sinkronisasi ulang subscription tanpa harus tahu token-nya.
let activeParticipantToken = null;
let messageListenerAttached = false;

function withTimeout(promise, ms, reason) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(reason)), ms)),
  ]);
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

function sameApplicationServerKey(a, b) {
  if (!a || !b) return false;
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function toPayloadSubscription(sub) {
  const json = sub.toJSON();
  return { endpoint: json.endpoint, keys: json.keys };
}

function postSubscription(participant_token, subscription) {
  return api.post("/push/subscribe", { participant_token, subscription });
}

function attachMessageListener() {
  if (messageListenerAttached || !("serviceWorker" in navigator)) return;
  messageListenerAttached = true;

  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || !activeParticipantToken) return;

    // Browser merotasi subscription (bisa terjadi kapan saja, termasuk setelah deploy).
    // SW yang baru berhasil subscribe mengirim subscription barunya ke sini.
    if (data.type === "push-resubscribed" && data.subscription) {
      postSubscription(activeParticipantToken, data.subscription).catch(() => {});
      return;
    }

    // SW tidak bisa subscribe sendiri (applicationServerKey tidak ada) → halaman yang urus.
    if (data.type === "push-needs-resubscribe") {
      subscribePush(activeParticipantToken);
    }
  });
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// iOS: push hanya jalan kalau web-nya dipasang ke Home Screen (iOS 16.4+).
// Di Safari biasa, browser memang tidak menawarkan Web Push sama sekali.
export function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  // iPadOS 13+ melapor sebagai "Macintosh" tapi punya sentuhan.
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
}

// True saat web berjalan sebagai app terpasang (Home Screen di iOS, install PWA
// di Android/desktop). Di standalone inilah Web Push di iOS diperbolehkan.
export function isStandalone() {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches
    );
  } catch {
    return false;
  }
}

export function isIosSafari() {
  const ua = typeof window !== "undefined" ? window.navigator.userAgent || "" : "";
  return isIos() && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    return reg;
  } catch (e) {
    console.warn("[push] SW register failed", e);
    return null;
  }
}

// navigator.serviceWorker.ready bisa menggantung selamanya kalau registration gagal,
// jadi selalu pasang timeout supaya UI bisa menampilkan pesan error.
export async function getReadyRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) reg = await registerSW();
    if (reg?.active) return reg;
    return await withTimeout(navigator.serviceWorker.ready, SW_READY_TIMEOUT_MS, "sw-timeout");
  } catch (e) {
    console.warn("[push] service worker tidak siap:", e.message);
    return null;
  }
}

export async function getExistingSubscription() {
  const reg = await getReadyRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function getVapidPublicKey() {
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (fromEnv) return fromEnv;
  try {
    const res = await api.get("/push/vapid-public");
    return res.data.publicKey;
  } catch {
    return null;
  }
}

/**
 * Pastikan browser subscribe push DAN server menyimpan subscription-nya.
 * @returns {Promise<{ok: boolean, synced?: boolean, reason?: string}>}
 */
export async function subscribePush(participant_token) {
  if (!participant_token) return { ok: false, reason: "no-token" };
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (Notification.permission === "denied") return { ok: false, reason: "denied" };

  try {
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return { ok: false, reason: perm };
    }

    const reg = await getReadyRegistration();
    if (!reg) return { ok: false, reason: "sw-unavailable" };

    const publicKey = await getVapidPublicKey();
    if (!publicKey) return { ok: false, reason: "no-vapid" };
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    let sub = await reg.pushManager.getSubscription();

    // Subscription lama yang dibuat dengan VAPID key berbeda (mis. waktu masih
    // localhost) akan bikin pushManager.subscribe() gagal InvalidStateError.
    // Hapus dulu, lalu subscribe ulang pakai key yang sekarang.
    if (sub && !sameApplicationServerKey(sub.options?.applicationServerKey, applicationServerKey)) {
      console.warn("[push] subscription lama pakai VAPID key berbeda, subscribe ulang");
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }

    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      } catch (e) {
        if (e.name !== "InvalidStateError") throw e;
        const stale = await reg.pushManager.getSubscription();
        if (stale) await stale.unsubscribe().catch(() => {});
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      }
    }

    attachMessageListener();
    activeParticipantToken = participant_token;

    try {
      await postSubscription(participant_token, toPayloadSubscription(sub));
    } catch (e) {
      // Subscription di browser sudah ada, tapi server belum punya → notifikasi
      // tidak akan pernah terkirim. Laporkan sebagai gagal sync.
      console.warn("[push] subscription gagal disimpan ke server", e);
      return { ok: true, synced: false, reason: e.message || "sync-failed" };
    }

    return { ok: true, synced: true };
  } catch (e) {
    console.warn("[push] subscribe failed", e);
    return { ok: false, reason: e.message || "subscribe-failed" };
  }
}

export async function unsubscribePush(participant_token) {
  try {
    const reg = await getReadyRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    activeParticipantToken = null;
    await api.post("/push/unsubscribe", { participant_token });
  } catch {}
}

export async function getPushStatus(participant_token) {
  const res = await api.get(`/push/status/${participant_token}`);
  return res.data;
}
