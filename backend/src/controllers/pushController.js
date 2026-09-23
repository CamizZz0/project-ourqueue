import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { pushSubscriptions, queueEntries } from "../db/schema.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { env } from "../config/env.js";
import { sendPushToParticipant } from "../services/pushService.js";

export const getVapidPublic = async (req, res) => {
  return sendSuccess(res, "VAPID public key", { publicKey: env.VAPID_PUBLIC_KEY });
};

export const subscribePush = async (req, res, next) => {
  try {
    const { participant_token, subscription } = req.body;
    if (!participant_token || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return sendError(res, "participant_token dan subscription{endpoint,keys{p256dh,auth}} wajib.", null, 400);
    }

    const [entry] = await db.select({ id: queueEntries.id }).from(queueEntries).where(eq(queueEntries.participant_token, participant_token)).limit(1);
    if (!entry) return sendError(res, "participant_token tidak ditemukan.", null, 404);

    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;
    const endpoint = subscription.endpoint;

    const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.participant_token, participant_token)).limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(pushSubscriptions).set({ endpoint, p256dh, auth, updated_at: new Date() }).where(eq(pushSubscriptions.participant_token, participant_token)).returning();
      return sendSuccess(res, "Subscription diperbarui.", { subscription: updated });
    }

    const [created] = await db.insert(pushSubscriptions).values({ participant_token, endpoint, p256dh, auth }).returning();
    return sendSuccess(res, "Berhasil subscribe notifikasi.", { subscription: created }, 201);
  } catch (e) { next(e); }
};

// Notifikasi tes: dipakai tombol "Tes notifikasi" di halaman tiket peserta.
// Tujuannya memastikan subscription benar-benar berfungsi di perangkat peserta
// (terutama iOS, yang butuh app terpasang di Home Screen agar push bisa masuk).
export const sendTestPush = async (req, res, next) => {
  try {
    const { participant_token } = req.body;
    if (!participant_token) return sendError(res, "participant_token wajib.", null, 400);

    const [entry] = await db
      .select({ id: queueEntries.id })
      .from(queueEntries)
      .where(eq(queueEntries.participant_token, participant_token))
      .limit(1);
    if (!entry) return sendError(res, "participant_token tidak ditemukan.", null, 404);

    const result = await sendPushToParticipant(participant_token, {
      title: "🔔 Notifikasi tes OurQueue",
      body: "Berhasil! Notifikasi di perangkat ini berfungsi normal.",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "ourqueue-test",
      data: { url: "/", type: "test" },
      type: "test",
    });

    // Selalu 200 dengan flag sent: kegagalan kirim bukan error server, tapi info
    // yang UI tampilkan apa adanya (mis. "subscription belum tersimpan").
    return sendSuccess(res, result.sent ? "Notifikasi tes terkirim." : "Notifikasi tes gagal terkirim.", {
      sent: !!result.sent,
      reason: result.sent ? null : result.reason || "unknown",
    });
  } catch (e) { next(e); }
};

// Endpoint diagnosa: dipakai untuk memastikan subscription peserta benar-benar
// tersimpan di server (bukan cuma ada di browser). Berguna saat notifikasi
// terasa "hilang" setelah deploy.
export const getPushStatus = async (req, res, next) => {
  try {
    const { participant_token } = req.params;
    const [sub] = await db
      .select({ endpoint: pushSubscriptions.endpoint, updated_at: pushSubscriptions.updated_at })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.participant_token, participant_token))
      .limit(1);

    let endpoint_host = null;
    if (sub?.endpoint) {
      try { endpoint_host = new URL(sub.endpoint).host; } catch { endpoint_host = "invalid"; }
    }

    return sendSuccess(res, "Status push subscription", {
      subscribed: !!sub,
      updated_at: sub?.updated_at ?? null,
      endpoint_host,
    });
  } catch (e) { next(e); }
};

export const unsubscribePush = async (req, res, next) => {
  try {
    const { participant_token } = req.body;
    if (!participant_token) return sendError(res, "participant_token wajib.", null, 400);
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.participant_token, participant_token));
    return sendSuccess(res, "Berhasil unsubscribe.");
  } catch (e) { next(e); }
};
