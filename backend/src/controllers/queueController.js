import crypto from "crypto";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";
import { db } from "../config/database.js";
import { queues, queueEntries } from "../db/schema.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { notifyCalling } from "../services/pushService.js";

export const createQueue = async (req, res, next) => {
  try {
    const { nama_antrean, deskripsi, enabled_fields, avg_service_minutes } = req.body;

    const userId = req.user.id;

    const qrCodeToken = crypto.randomBytes(8).toString("hex");

    const [newQueue] = await db
      .insert(queues)
      .values({
        user_id: userId,
        nama_antrean,
        deskripsi,
        enabled_fields,
        avg_service_minutes: avg_service_minutes ?? 5,
        qr_code_token: qrCodeToken,
        status: "active",
      })
      .returning();

    return sendSuccess(
      res,
      "Antrean baru berhasil dibuat dan siap digunakan.",
      {
        queue: newQueue,
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

export const getMyQueues = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page, limit, search, status } = req.valid.query;
    const offset = (page - 1) * limit;

    const conditions = [eq(queues.user_id, userId)];
    if (status) conditions.push(eq(queues.status, status));
    if (search) {
      conditions.push(
        or(
          ilike(queues.nama_antrean, `%${search}%`),
          ilike(queues.deskripsi, `%${search}%`)
        )
      );
    }

    const [countRow] = await db
      .select({ count: sql`COUNT(*)`.as("count") })
      .from(queues)
      .where(and(...conditions));
    const totalItems = Number(countRow?.count || 0);

    const myQueues = await db
      .select()
      .from(queues)
      .where(and(...conditions))
      .orderBy(desc(queues.created_at))
      .limit(limit)
      .offset(offset);

    const queuesWithStats = await Promise.all(
      myQueues.map(async (queue) => {
        const [stats] = await db
          .select({
            total: sql`COUNT(*)`.as("total"),
            waiting: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'waiting')`.as(
              "waiting"
            ),
            calling: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'calling')`.as(
              "calling"
            ),
            completed: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'completed')`.as(
              "completed"
            ),
          })
          .from(queueEntries)
          .where(eq(queueEntries.queue_id, queue.id));

        return {
          ...queue,
          stats: {
            total: Number(stats?.total || 0),
            waiting: Number(stats?.waiting || 0),
            calling: Number(stats?.calling || 0),
            completed: Number(stats?.completed || 0),
          },
        };
      })
    );

    return sendSuccess(res, "Daftar antrean berhasil didapatkan.", {
      queues: queuesWithStats,
      total: queuesWithStats.length,
      meta: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
        search: search || null,
        status: status || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getQueueByQrToken = async (req, res, next) => {
  try {
    const { qrToken } = req.params;

    const [queue] = await db
      .select({
        id: queues.id,
        nama_antrean: queues.nama_antrean,
        deskripsi: queues.deskripsi,
        enabled_fields: queues.enabled_fields,
        status: queues.status,
        avg_service_minutes: queues.avg_service_minutes,
        created_at: queues.created_at,
      })
      .from(queues)
      .where(eq(queues.qr_code_token, qrToken))
      .limit(1);

    if (!queue) {
      return sendError(res, "Antrean tidak ditemukan (QR token tidak valid).", null, 404);
    }

    const [waitingCount] = await db
      .select({ count: sql`COUNT(*)`.as("count") })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.queue_id, queue.id),
          eq(queueEntries.status, "waiting")
        )
      );

    const [currentCalling] = await db
      .select({
        nomor_antrean: queueEntries.nomor_antrean,
        data_peserta: queueEntries.data_peserta,
      })
      .from(queueEntries)
      .where(
        and(
          eq(queueEntries.queue_id, queue.id),
          eq(queueEntries.status, "calling")
        )
      )
      .orderBy(asc(queueEntries.nomor_antrean))
      .limit(1);

    return sendSuccess(res, "Data antrean berhasil ditemukan.", {
      queue,
      live_stats: {
        waiting_count: Number(waitingCount?.count || 0),
        current_calling: currentCalling || null,
        estimasi_menit:
          Number(waitingCount?.count || 0) * (queue.avg_service_minutes ?? 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateQueueStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;
    const { status } = req.body;

    const [existing] = await db
      .select()
      .from(queues)
      .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
      .limit(1);

    if (!existing) {
      return sendError(
        res,
        "Antrean tidak ditemukan atau Anda tidak memiliki akses.",
        null,
        404
      );
    }

    const [updated] = await db
      .update(queues)
      .set({ status })
      .where(eq(queues.id, queueId))
      .returning();

    return sendSuccess(res, `Status antrean berhasil diubah menjadi '${status}'.`, {
      queue: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getQueueEntries = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;
    const { status, page, limit } = req.valid.query;
    const offset = (page - 1) * limit;

    const [queue] = await db
      .select()
      .from(queues)
      .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
      .limit(1);

    if (!queue) {
      return sendError(
        res,
        "Antrean tidak ditemukan atau Anda tidak memiliki akses.",
        null,
        404
      );
    }

    const statusFilter = status || null;

    const conditions = [eq(queueEntries.queue_id, queueId)];
    if (statusFilter) {
      conditions.push(eq(queueEntries.status, statusFilter));
    }

    const [countRow] = await db
      .select({ count: sql`COUNT(*)`.as("count") })
      .from(queueEntries)
      .where(and(...conditions));
    const totalItems = Number(countRow?.count || 0);

    const entries = await db
      .select()
      .from(queueEntries)
      .where(and(...conditions))
      .orderBy(asc(queueEntries.nomor_antrean))
      .limit(limit)
      .offset(offset);

    const [stats] = await db
      .select({
        total: sql`COUNT(*)`.as("total"),
        waiting: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'waiting')`.as("waiting"),
        calling: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'calling')`.as("calling"),
        completed: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'completed')`.as(
          "completed"
        ),
        skipped: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'skipped')`.as("skipped"),
        cancelled: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'cancelled')`.as(
          "cancelled"
        ),
      })
      .from(queueEntries)
      .where(eq(queueEntries.queue_id, queueId));

    return sendSuccess(res, "Daftar peserta antrean berhasil didapatkan.", {
      queue_info: {
        id: queue.id,
        nama_antrean: queue.nama_antrean,
        status: queue.status,
      },
      entries,
      total: entries.length,
      meta: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
        status: statusFilter,
      },
      stats: {
        total: Number(stats?.total || 0),
        waiting: Number(stats?.waiting || 0),
        calling: Number(stats?.calling || 0),
        completed: Number(stats?.completed || 0),
        skipped: Number(stats?.skipped || 0),
        cancelled: Number(stats?.cancelled || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getQueueDetailById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;

    const [queue] = await db
      .select()
      .from(queues)
      .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
      .limit(1);

    if (!queue) {
      return sendError(
        res,
        "Antrean tidak ditemukan atau Anda tidak memiliki akses.",
        null,
        404
      );
    }

    const [stats] = await db
      .select({
        total: sql`COUNT(*)`.as("total"),
        waiting: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'waiting')`.as("waiting"),
        calling: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'calling')`.as("calling"),
        completed: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'completed')`.as(
          "completed"
        ),
        skipped: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'skipped')`.as("skipped"),
        cancelled: sql`COUNT(*) FILTER (WHERE ${queueEntries.status} = 'cancelled')`.as(
          "cancelled"
        ),
      })
      .from(queueEntries)
      .where(eq(queueEntries.queue_id, queueId));

    return sendSuccess(res, "Detail antrean berhasil didapatkan.", {
      queue,
      stats: {
        total: Number(stats?.total || 0),
        waiting: Number(stats?.waiting || 0),
        calling: Number(stats?.calling || 0),
        completed: Number(stats?.completed || 0),
        skipped: Number(stats?.skipped || 0),
        cancelled: Number(stats?.cancelled || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateQueue = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;
    const { nama_antrean, deskripsi, enabled_fields, avg_service_minutes } = req.body;

    const [existing] = await db
      .select()
      .from(queues)
      .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
      .limit(1);

    if (!existing) {
      return sendError(
        res,
        "Antrean tidak ditemukan atau Anda tidak memiliki akses.",
        null,
        404
      );
    }

    const patch = {};
    if (nama_antrean !== undefined) {
      patch.nama_antrean = nama_antrean;
    }
    if (deskripsi !== undefined) {
      patch.deskripsi =
        typeof deskripsi === "string" ? deskripsi.trim() || null : null;
    }
    if (enabled_fields !== undefined) {
      patch.enabled_fields = enabled_fields;
    }
    if (avg_service_minutes !== undefined) {
      patch.avg_service_minutes = avg_service_minutes;
    }

    const [updated] = await db
      .update(queues)
      .set(patch)
      .where(eq(queues.id, queueId))
      .returning();

    return sendSuccess(res, "Data antrean berhasil diperbarui.", {
      queue: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQueue = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;

    const [existing] = await db
      .select({ id: queues.id })
      .from(queues)
      .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
      .limit(1);

    if (!existing) {
      return sendError(
        res,
        "Antrean tidak ditemukan atau Anda tidak memiliki akses.",
        null,
        404
      );
    }

    await db.delete(queues).where(eq(queues.id, queueId));

    return sendSuccess(res, "Antrean beserta seluruh tiketnya berhasil dihapus.", {
      deleted_queue_id: queueId,
    });
  } catch (error) {
    next(error);
  }
};

export const callNextEntry = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;

    const result = await db.transaction(async (tx) => {
      const [queue] = await tx
        .select()
        .from(queues)
        .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
        .for("update")
        .limit(1);

      if (!queue) {
        return { error: "Antrean tidak ditemukan atau Anda tidak memiliki akses.", statusCode: 404 };
      }

      if (queue.status !== "active") {
        return {
          error: `Antrean berstatus '${queue.status}'. Ubah ke 'active' untuk memanggil nomor.`,
          statusCode: 400,
        };
      }

      let completedEntry = null;
      const [currentCalling] = await tx
        .select()
        .from(queueEntries)
        .where(
          and(
            eq(queueEntries.queue_id, queueId),
            eq(queueEntries.status, "calling")
          )
        )
        .orderBy(asc(queueEntries.nomor_antrean))
        .for("update")
        .limit(1);

      if (currentCalling) {
        const [done] = await tx
          .update(queueEntries)
          .set({ status: "completed" })
          .where(eq(queueEntries.id, currentCalling.id))
          .returning();
        completedEntry = done;
      }

      const [nextWaiting] = await tx
        .select()
        .from(queueEntries)
        .where(
          and(
            eq(queueEntries.queue_id, queueId),
            eq(queueEntries.status, "waiting")
          )
        )
        .orderBy(asc(queueEntries.nomor_antrean))
        .for("update")
        .limit(1);

      if (!nextWaiting) {
        return {
          error: "Tidak ada peserta dengan status 'waiting'. Antrean sudah habis.",
          statusCode: 400,
          completed: completedEntry,
        };
      }

      const [called] = await tx
        .update(queueEntries)
        .set({ status: "calling" })
        .where(eq(queueEntries.id, nextWaiting.id))
        .returning();

      const [remaining] = await tx
        .select({ count: sql`COUNT(*)`.as("count") })
        .from(queueEntries)
        .where(
          and(
            eq(queueEntries.queue_id, queueId),
            eq(queueEntries.status, "waiting")
          )
        );

      return {
        data: {
          called,
          completed: completedEntry,
          remaining_waiting: Number(remaining?.count || 0),
        },
      };
    });

    if (result.error) {
      return sendError(res, result.error, result.completed ? { completed: result.completed } : null, result.statusCode || 400);
    }

    // Fire-and-forget push notifikasi calling (jangan blokir response)
    try { await notifyCalling(result.data.called.participant_token); } catch (e) { console.error("[callNextEntry] push error", e.message); }

    return sendSuccess(
      res,
      `Nomor antrean ${result.data.called.nomor_antrean} kini dipanggil.`,
      result.data
    );
  } catch (error) {
    next(error);
  }
};

export const recallCurrentEntry = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;
    const { entry_id } = req.body;
    const entryId = entry_id ?? null;

    const [queue] = await db
      .select({ id: queues.id, status: queues.status })
      .from(queues)
      .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
      .limit(1);

    if (!queue) {
      return sendError(
        res,
        "Antrean tidak ditemukan atau Anda tidak memiliki akses.",
        null,
        404
      );
    }

    if (queue.status !== "active") {
      return sendError(
        res,
        `Antrean berstatus '${queue.status}'. Ubah ke 'active' untuk memanggil ulang nomor.`,
        null,
        400
      );
    }

    let recalled;
    if (entryId !== null) {
      const [specific] = await db
        .select()
        .from(queueEntries)
        .where(and(eq(queueEntries.id, entryId), eq(queueEntries.queue_id, queueId)))
        .limit(1);

      if (!specific) {
        return sendError(res, "Tiket tidak ditemukan dalam antrean ini.", null, 404);
      }
      if (specific.status !== "calling") {
        return sendError(
          res,
          `Tiket nomor ${specific.nomor_antrean} berstatus '${specific.status}', hanya tiket 'calling' yang bisa dipanggil ulang.`,
          null,
          400
        );
      }
      recalled = specific;
    } else {
      const [current] = await db
        .select()
        .from(queueEntries)
        .where(
          and(eq(queueEntries.queue_id, queueId), eq(queueEntries.status, "calling"))
        )
        .orderBy(asc(queueEntries.nomor_antrean))
        .limit(1);

      if (!current) {
        return sendError(
          res,
          "Tidak ada nomor yang sedang dipanggil (calling).",
          null,
          400
        );
      }
      recalled = current;
    }

    try { await notifyCalling(recalled.participant_token); } catch (e) { console.error("[recall] push error", e.message); }

    return sendSuccess(
      res,
      `Nomor antrean ${recalled.nomor_antrean} dipanggil ulang.`,
      { recalled }
    );
  } catch (error) {
    next(error);
  }
};

export const resetQueue = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;

    const [queue] = await db
      .select({ id: queues.id })
      .from(queues)
      .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
      .limit(1);

    if (!queue) {
      return sendError(
        res,
        "Antrean tidak ditemukan atau Anda tidak memiliki akses.",
        null,
        404
      );
    }

    const deleted = await db
      .delete(queueEntries)
      .where(eq(queueEntries.queue_id, queueId))
      .returning({ id: queueEntries.id });

    return sendSuccess(res, "Antrean berhasil di-reset. Semua tiket telah dihapus.", {
      queue_id: queueId,
      deleted_count: deleted.length,
    });
  } catch (error) {
    next(error);
  }
};

export const regenerateQrToken = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: queueId } = req.valid.params;

    const [queue] = await db
      .select({ id: queues.id })
      .from(queues)
      .where(and(eq(queues.id, queueId), eq(queues.user_id, userId)))
      .limit(1);

    if (!queue) {
      return sendError(
        res,
        "Antrean tidak ditemukan atau Anda tidak memiliki akses.",
        null,
        404
      );
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const qrCodeToken = crypto.randomBytes(8).toString("hex");
        const [updated] = await db
          .update(queues)
          .set({ qr_code_token: qrCodeToken })
          .where(eq(queues.id, queueId))
          .returning();

        return sendSuccess(res, "QR token baru berhasil dibuat. QR lama sudah tidak berlaku.", {
          queue: updated,
        });
      } catch (err) {
        if (err?.code !== "23505" || attempt === 1) throw err;
      }
    }
  } catch (error) {
    next(error);
  }
};
