import crypto from "crypto";
import { eq, sql, and, lt } from "drizzle-orm";
import { db } from "../config/database.js";
import { queues, queueEntries } from "../db/schema.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { notifyCalling } from "../services/pushService.js";

// ===== Server-Sent Events (realtime status tiket peserta) =====
// Stream ini mengecek perubahan di DB sendiri (instance Vercel tidak berbagi memori),
// jadi event fan-out tidak butuh Redis. Query per tick dibuat seringan mungkin.
const SSE_POLL_MS = 2000;
const SSE_PING_MS = 15000;
// Function Vercel dibatasi umurnya (Hobby 300s), jadi tutup sendiri dengan rapi
// sebelum diputus paksa. EventSource akan otomatis menyambung ulang.
const SSE_MAX_LIFETIME_MS = 240000;
const FINAL_STATUSES = ["completed", "skipped", "cancelled"];

const entryFields = {
  id: queueEntries.id,
  queue_id: queueEntries.queue_id,
  nomor_antrean: queueEntries.nomor_antrean,
  data_peserta: queueEntries.data_peserta,
  status: queueEntries.status,
  participant_token: queueEntries.participant_token,
  created_at: queueEntries.created_at,
  nama_antrean: queues.nama_antrean,
  queue_status: queues.status,
};

// State lengkap sebuah tiket (dipakai GET /:token dan event pertama pada stream)
async function loadEntryState(token) {
  const [entry] = await db
    .select(entryFields)
    .from(queueEntries)
    .innerJoin(queues, eq(queueEntries.queue_id, queues.id))
    .where(eq(queueEntries.participant_token, token))
    .limit(1);

  if (!entry) return null;

  const [aheadCountResult] = await db
    .select({
      count: sql`COUNT(*)`.as("count"),
    })
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.queue_id, entry.queue_id),
        eq(queueEntries.status, "waiting"),
        lt(queueEntries.nomor_antrean, entry.nomor_antrean)
      )
    );

  return {
    tiket: entry,
    sisa_antrean_di_depan: Number(aheadCountResult?.count || 0),
  };
}

// State ringan untuk polling di dalam stream: 1 round trip saja.
// Hanya berisi field yang berubah-ubah, frontend akan menggabungkannya dengan data lama.
async function loadEntryLightState(token) {
  const [row] = await db
    .select({
      participant_token: queueEntries.participant_token,
      nomor_antrean: queueEntries.nomor_antrean,
      status: queueEntries.status,
      sisa_antrean_di_depan: sql`(
        SELECT COUNT(*) FROM ${queueEntries} AS ahead
        WHERE ahead.queue_id = ${queueEntries.queue_id}
          AND ahead.status = 'waiting'
          AND ahead.nomor_antrean < ${queueEntries.nomor_antrean}
      )`.as("sisa_antrean_di_depan"),
    })
    .from(queueEntries)
    .where(eq(queueEntries.participant_token, token))
    .limit(1);

  if (!row) return null;

  return {
    tiket: {
      participant_token: row.participant_token,
      nomor_antrean: row.nomor_antrean,
      status: row.status,
    },
    sisa_antrean_di_depan: Number(row.sisa_antrean_di_depan || 0),
  };
}

function sseWrite(res, event, data) {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const stateSignature = (state) =>
  `${state.tiket.status}|${state.tiket.nomor_antrean}|${state.sisa_antrean_di_depan}`;

export const takeQueueEntry = async (req, res, next) => {
  try {
    const { queue_id: numericQueueId, data_peserta } = req.body;

    const transactionResult = await db.transaction(async (tx) => {
      const [queue] = await tx
        .select()
        .from(queues)
        .where(eq(queues.id, numericQueueId))
        .for("update");

      if (!queue) {
        return { error: "Antrean tidak ditemukan.", statusCode: 404 };
      }

      if (queue.status !== "active") {
        return {
          error: "Antrean ini sedang tidak menerima pendaftaran tiket baru (status tidak aktif).",
          statusCode: 400,
        };
      }

      const requiredFields = Array.isArray(queue.enabled_fields)
        ? queue.enabled_fields
        : [];

      const missingFields = [];
      for (const field of requiredFields) {
        const val = data_peserta[field];
        if (val === undefined || val === null || String(val).trim() === "") {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        return {
          error: `Kolom data peserta berikut wajib diisi: ${missingFields.join(", ")}`,
          statusCode: 400,
        };
      }

      const [lastEntry] = await tx
        .select({
          maxNumber: sql`COALESCE(MAX(${queueEntries.nomor_antrean}), 0)`.as("maxNumber"),
        })
        .from(queueEntries)
        .where(eq(queueEntries.queue_id, numericQueueId));

      const nextQueueNumber = Number(lastEntry?.maxNumber || 0) + 1;

      const participantToken = crypto.randomUUID();

      const [newEntry] = await tx
        .insert(queueEntries)
        .values({
          queue_id: numericQueueId,
          data_peserta,
          nomor_antrean: nextQueueNumber,
          status: "waiting",
          participant_token: participantToken,
        })
        .returning();

      return {
        data: {
          entry: newEntry,
          queue_info: {
            id: queue.id,
            nama_antrean: queue.nama_antrean,
            deskripsi: queue.deskripsi,
          },
        },
      };
    });

    if (transactionResult.error) {
      return sendError(
        res,
        transactionResult.error,
        null,
        transactionResult.statusCode || 400
      );
    }

    return sendSuccess(
      res,
      "Nomor antrean berhasil diambil.",
      transactionResult.data,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const getEntryByToken = async (req, res, next) => {
  try {
    const state = await loadEntryState(req.params.token);
    if (!state) {
      return sendError(res, "Tiket antrean tidak ditemukan.", null, 404);
    }

    return sendSuccess(res, "Data tiket berhasil ditemukan.", state);
  } catch (error) {
    next(error);
  }
};

// GET /api/entries/:token/stream — SSE: server kirim update begitu status tiket berubah.
export const streamEntryByToken = async (req, res, next) => {
  const { token } = req.params;

  try {
    // Pastikan tiketnya ada sebelum membuka koneksi panjang.
    const initialState = await loadEntryState(token);
    if (!initialState) {
      return sendError(res, "Tiket antrean tidak ditemukan.", null, 404);
    }

    res.set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    // Hint ke EventSource: sambung ulang 2 detik setelah koneksi ditutup server.
    res.write("retry: 2000\n\n");

    let finished = false;
    let busy = false;
    let lastSignature = "";

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(pollTimer);
      clearInterval(pingTimer);
      clearTimeout(lifetimeTimer);
      try {
        res.end();
      } catch {}
    };

    const pushState = (state) => {
      const signature = stateSignature(state);
      if (signature === lastSignature) return;
      lastSignature = signature;
      sseWrite(res, "ticket", state);
    };

    pushState(initialState);

    const pollTimer = setInterval(async () => {
      if (busy || finished) return;
      busy = true;
      try {
        const state = await loadEntryLightState(token);
        if (!state) {
          // Tiket dihapus admin / antrean direset.
          sseWrite(res, "gone", { participant_token: token });
          return finish();
        }
        pushState(state);
        // Status akhir: tidak ada lagi yang perlu ditunggu.
        if (FINAL_STATUSES.includes(state.tiket.status)) return finish();
      } catch (e) {
        console.error("[sse] gagal cek status tiket:", e.message);
      } finally {
        busy = false;
      }
    }, SSE_POLL_MS);

    // Ping berkala: menjaga koneksi tetap hidup dan dipakai frontend sebagai detak
    // untuk mendeteksi koneksi yang macet.
    const pingTimer = setInterval(() => {
      if (finished) return;
      sseWrite(res, "ping", { t: Date.now() });
    }, SSE_PING_MS);

    const lifetimeTimer = setTimeout(finish, SSE_MAX_LIFETIME_MS);

    req.on("close", finish);
    res.on("close", finish);
  } catch (error) {
    if (res.headersSent) {
      try {
        res.end();
      } catch {}
      return;
    }
    next(error);
  }
};

export const updateEntryStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: entryId } = req.valid.params;
    const { status } = req.body;

    const [existing] = await db
      .select({
        entry: queueEntries,
        owner_id: queues.user_id,
        queue_id: queues.id,
        queue_status: queues.status,
      })
      .from(queueEntries)
      .innerJoin(queues, eq(queueEntries.queue_id, queues.id))
      .where(eq(queueEntries.id, entryId))
      .limit(1);

    if (!existing) {
      return sendError(res, "Tiket antrean tidak ditemukan.", null, 404);
    }

    if (existing.owner_id !== userId) {
      return sendError(
        res,
        "Akses ditolak. Tiket ini bukan bagian dari antrean milik Anda.",
        null,
        403
      );
    }

    const [updated] = await db
      .update(queueEntries)
      .set({ status })
      .where(eq(queueEntries.id, entryId))
      .returning();

    if (status === "calling") {
      try { await notifyCalling(updated.participant_token); } catch (e) { console.error("[updateEntryStatus] push error", e.message); }
    }

    return sendSuccess(res, `Status tiket nomor ${updated.nomor_antrean} berhasil diubah menjadi '${status}'.`, {
      entry: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEntry = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: entryId } = req.valid.params;

    const [existing] = await db
      .select({
        entry: queueEntries,
        owner_id: queues.user_id,
      })
      .from(queueEntries)
      .innerJoin(queues, eq(queueEntries.queue_id, queues.id))
      .where(eq(queueEntries.id, entryId))
      .limit(1);

    if (!existing) {
      return sendError(res, "Tiket antrean tidak ditemukan.", null, 404);
    }

    if (existing.owner_id !== userId) {
      return sendError(
        res,
        "Akses ditolak. Tiket ini bukan bagian dari antrean milik Anda.",
        null,
        403
      );
    }

    await db.delete(queueEntries).where(eq(queueEntries.id, entryId));

    return sendSuccess(res, `Tiket nomor ${existing.entry.nomor_antrean} berhasil dihapus.`, {
      deleted_entry_id: entryId,
      nomor_antrean: existing.entry.nomor_antrean,
    });
  } catch (error) {
    next(error);
  }
};
