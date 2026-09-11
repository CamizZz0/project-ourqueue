import crypto from "crypto";
import { eq, sql, and, lt } from "drizzle-orm";
import { db } from "../config/database.js";
import { queues, queueEntries } from "../db/schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Controller bagi Peserta (Guest) untuk Mengambil Nomor Antrean Baru
 * Public endpoint (tanpa autentikasi JWT)
 */
export const takeQueueEntry = async (req, res, next) => {
  try {
    const { queue_id, data_peserta } = req.body;

    // 1. Validasi input dasar
    if (!queue_id) {
      return sendError(res, "ID antrean (queue_id) wajib disertakan.", null, 400);
    }

    if (!data_peserta || typeof data_peserta !== "object" || Object.keys(data_peserta).length === 0) {
      return sendError(res, "Data peserta (data_peserta) wajib diisi.", null, 400);
    }

    const numericQueueId = parseInt(queue_id, 10);
    if (isNaN(numericQueueId)) {
      return sendError(res, "ID antrean (queue_id) harus berupa angka yang valid.", null, 400);
    }

    // 2. Jalankan Database Transaction untuk mencegah Race Condition
    const transactionResult = await db.transaction(async (tx) => {
      // Kunci baris antrean dengan FOR UPDATE.
      // Request lain yang mendaftar di antrean yang sama di detik yang sama akan antre menunggu giliran.
      const [queue] = await tx
        .select()
        .from(queues)
        .where(eq(queues.id, numericQueueId))
        .for("update");

      if (!queue) {
        return { error: "Antrean tidak ditemukan.", statusCode: 404 };
      }

      // Pastikan status antrean sedang aktif/buka
      if (queue.status !== "active") {
        return {
          error: "Antrean ini sedang tidak menerima pendaftaran tiket baru (status tidak aktif).",
          statusCode: 400,
        };
      }

      // 3. Validasi kelengkapan data_peserta sesuai enabled_fields yang ditentukan admin
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

      // 4. Hitung nomor_antrean berikutnya secara berurutan dan aman
      const [lastEntry] = await tx
        .select({
          maxNumber: sql`COALESCE(MAX(${queueEntries.nomor_antrean}), 0)`.as("maxNumber"),
        })
        .from(queueEntries)
        .where(eq(queueEntries.queue_id, numericQueueId));

      const nextQueueNumber = Number(lastEntry?.maxNumber || 0) + 1;

      // 5. Generate token unik peserta (UUID v4) untuk disimpan di localStorage frontend
      const participantToken = crypto.randomUUID();

      // 6. Simpan tiket peserta ke tabel queue_entries
      const [newEntry] = await tx
        .insert(queueEntries)
        .values({
          queue_id: numericQueueId,
          data_peserta,
          nomor_antrean: nextQueueNumber,
          status: "waiting", // Status awal: waiting
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

/**
 * Controller untuk Mengecek Status Tiket Peserta Berdasarkan participant_token
 * Public endpoint (digunakan oleh tamu untuk live tracking nomor panggilan)
 */
export const getEntryByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return sendError(res, "Participant token wajib disertakan.", null, 400);
    }

    // Cari tiket berdasarkan token unik
    const [entry] = await db
      .select({
        id: queueEntries.id,
        queue_id: queueEntries.queue_id,
        nomor_antrean: queueEntries.nomor_antrean,
        data_peserta: queueEntries.data_peserta,
        status: queueEntries.status,
        participant_token: queueEntries.participant_token,
        created_at: queueEntries.created_at,
        nama_antrean: queues.nama_antrean,
        queue_status: queues.status,
      })
      .from(queueEntries)
      .innerJoin(queues, eq(queueEntries.queue_id, queues.id))
      .where(eq(queueEntries.participant_token, token))
      .limit(1);

    if (!entry) {
      return sendError(res, "Tiket antrean tidak ditemukan.", null, 404);
    }

    // Hitung berapa banyak peserta yang masih berstatus 'waiting' di depan nomor ini
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

    const sisaAntreanDiDepan = Number(aheadCountResult?.count || 0);

    return sendSuccess(res, "Data tiket berhasil ditemukan.", {
      tiket: entry,
      sisa_antrean_di_depan: sisaAntreanDiDepan,
    });
  } catch (error) {
    next(error);
  }
};

