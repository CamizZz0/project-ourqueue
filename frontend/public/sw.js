self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
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
