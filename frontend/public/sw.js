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

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(url) && "focus" in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
