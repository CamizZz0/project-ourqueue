// Service worker untuk menampilkan notifikasi antrean.
// File ini di-serve dari /sw.js, jadi jangan pernah di-cache lama
// (lihat header Cache-Control di vercel.json frontend).

// Langsung aktifkan versi terbaru setelah deploy, jangan tunggu semua tab ditutup,
// supaya handler push tidak pernah ketinggalan versi lama.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "Giliran kamu!", body: "" };
  }
  const title = data.title || "Giliran kamu!";
  const options = {
    body: data.body || "Silakan menuju loket sekarang.",
    icon: data.icon || "/favicon.svg",
    badge: data.badge || "/favicon.svg",
    tag: data.tag || "ourqueue-calling",
    renotify: true,
    requireInteraction: true,
    data: data.data || { url: "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Browser bisa merotasi push subscription kapan saja (termasuk setelah deploy).
// Tanpa handler ini, subscription di server jadi mati dan notifikasi berhenti
// tanpa error apa pun.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey;
      const announce = async (message) => {
        const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const win of wins) win.postMessage(message);
      };

      // Tanpa applicationServerKey kita tidak bisa subscribe sendiri,
      // minta tab yang terbuka untuk melakukannya.
      if (!applicationServerKey) {
        await announce({ type: "push-needs-resubscribe" });
        return;
      }

      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      const json = sub.toJSON();
      await announce({
        type: "push-resubscribed",
        subscription: { endpoint: json.endpoint, keys: json.keys },
      });
    })().catch((e) => console.warn("[sw] resubscribe gagal", e))
  );
});

// Cari tab yang URL-nya PERSIS sama dengan target (pathname+search). Matching
// lama pakai `w.url.includes(url)` — berbahaya: URL "/" cocok dengan SEMUA tab,
// jadi mengetuk notifikasi bisa memfokuskan halaman depan (home) alih-alih tiket.
function sameUrl(clientUrl, target) {
  try {
    const a = new URL(clientUrl);
    const b = new URL(target, self.location.origin);
    return a.pathname === b.pathname && a.search === b.search;
  } catch {
    return false;
  }
}

// Pakai URL absolut: beberapa WebView/iOS tidak menangani path relatif dengan benar.
function toAbsoluteUrl(url) {
  try {
    return new URL(url, self.location.origin).href;
  } catch {
    return url;
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const target = toAbsoluteUrl(url);
  event.waitUntil(
    (async () => {
      const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
      // 1) Tab yang persis membuka tiket ini → fokuskan.
      for (const w of wins) {
        if (sameUrl(w.url, target) && "focus" in w) return w.focus();
      }
      // 2) Tab tiket yang sama tapi query-nya beda (mis. tanpa ?t=) →
      //    arahkan ke URL lengkap, jangan cuma difokuskan setengah jalan.
      try {
        const targetPath = new URL(target).pathname;
        for (const w of wins) {
          try {
            const u = new URL(w.url);
            if (u.pathname === targetPath) {
              if ("navigate" in w) return w.navigate(target);
              // Fallback navigate tidak tersedia → fokuskan saja tab tersebut;
              // halaman tiket akan menyesuaikan diri dari token tersimpan.
              return w.focus();
            }
          } catch {}
        }
      } catch {}
      // 3) Tidak ada tab yang cocok → buka tab baru.
      if (clients.openWindow) return clients.openWindow(target);
    })()
  );
});
