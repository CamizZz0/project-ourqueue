import api from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (e) {
    console.warn("[push] SW register failed", e);
    return null;
  }
}

export async function getExistingSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribePush(participant_token) {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (Notification.permission === "denied") return { ok: false, reason: "denied" };

  try {
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return { ok: false, reason: perm };
    }

    const reg = await navigator.serviceWorker.ready.catch(() => registerSW());

    let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      try {
        const res = await api.get("/push/vapid-public");
        publicKey = res.data.publicKey;
      } catch {}
    }
    if (!publicKey) return { ok: false, reason: "no vapid" };

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = sub.toJSON();
    await api.post("/push/subscribe", {
      participant_token,
      subscription: { endpoint: json.endpoint, keys: json.keys },
    });

    return { ok: true };
  } catch (e) {
    console.warn("[push] subscribe failed", e);
    return { ok: false, reason: e.message };
  }
}

export async function unsubscribePush(participant_token) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await api.post("/push/unsubscribe", { participant_token });
  } catch {}
}
