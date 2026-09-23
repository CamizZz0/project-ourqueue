import webPush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { env } from "../config/env.js";
import { pushSubscriptions, queueEntries, queues } from "../db/schema.js";

try {
  webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
} catch (e) {
  console.error("[pushService] VAPID setup failed:", e.message);
}

export async function sendPushToParticipant(participant_token, payload) {
  if (!participant_token) return { sent: false, reason: "no token" };
  const [sub] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.participant_token, participant_token)).limit(1);
  if (!sub) return { sent: false, reason: "no subscription" };

  const pushSub = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await webPush.sendNotification(pushSub, JSON.stringify(payload));
    return { sent: true };
  } catch (err) {
    const status = err?.statusCode;
    if (status === 404 || status === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.participant_token, participant_token));
      console.log(`[pushService] removed expired sub ${participant_token} status=${status}`);
      return { sent: false, reason: "expired removed" };
    }
    console.error("[pushService] send failed:", err?.message || err);
    return { sent: false, reason: err?.message || "unknown" };
  }
}

export async function notifyCalling(participant_token) {
  const [entry] = await db.select({
    nomor_antrean: queueEntries.nomor_antrean,
    queue_id: queueEntries.queue_id,
    nama_antrean: queues.nama_antrean,
    qr_code_token: queues.qr_code_token,
  }).from(queueEntries).innerJoin(queues, eq(queueEntries.queue_id, queues.id)).where(eq(queueEntries.participant_token, participant_token)).limit(1);
  if (!entry) return { sent: false, reason: "entry not found" };

  const payload = {
    title: `Giliran kamu! #${entry.nomor_antrean}`,
    body: `${entry.nama_antrean} — silakan menuju loket sekarang.`,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: `calling-${participant_token}`,
    // ?t= wajib: app Home Screen / tab baru punya storage terpisah, tanpa token ini
    // halaman tiket tidak bisa memuat tiket peserta yang benar.
    data: { url: `/q/${entry.qr_code_token}?t=${participant_token}`, nomor_antrean: entry.nomor_antrean, queue_id: entry.queue_id, participant_token },
    type: "calling",
  };

  return sendPushToParticipant(participant_token, payload);
}
