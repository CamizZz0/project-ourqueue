import { eq, and, sql, ilike, or, desc, asc } from "drizzle-orm";
import { db } from "../config/database.js";
import { users, queues, queueEntries } from "../db/schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getStats = async (req, res, next) => {
  try {
    const [adminRow] = await db
      .select({ count: sql`COUNT(*)`.as("count") })
      .from(users)
      .where(eq(users.role, "admin"));

    const [totalQueuesRow] = await db.select({ count: sql`COUNT(*)`.as("count") }).from(queues);

    const [activeQueuesRow] = await db
      .select({ count: sql`COUNT(*)`.as("count") })
      .from(queues)
      .where(eq(queues.status, "active"));

    const [totalTicketsRow] = await db.select({ count: sql`COUNT(*)`.as("count") }).from(queueEntries);

    return sendSuccess(res, "Statistik sistem berhasil didapatkan.", {
      total_admin: Number(adminRow?.count || 0),
      total_queues: Number(totalQueuesRow?.count || 0),
      active_queues: Number(activeQueuesRow?.count || 0),
      total_tickets: Number(totalTicketsRow?.count || 0),
    });
  } catch (error) {
    next(error);
  }
};

export const listAdmins = async (req, res, next) => {
  try {
    const { page, limit, search } = req.valid.query;
    const offset = (page - 1) * limit;

    const conditions = [eq(users.role, "admin")];
    if (search && search.trim() !== "") {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(users.nama, term), ilike(users.email, term)));
    }

    const [countRow] = await db
      .select({ count: sql`COUNT(*)`.as("count") })
      .from(users)
      .where(and(...conditions));
    const totalItems = Number(countRow?.count || 0);

    const admins = await db
      .select({
        id: users.id,
        nama: users.nama,
        email: users.email,
        role: users.role,
        is_active: users.is_active,
        created_at: users.created_at,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.created_at))
      .limit(limit)
      .offset(offset);

    // Hitung jumlah antrean per admin
    const adminsWithQueueCount = await Promise.all(
      admins.map(async (admin) => {
        const [queueCountRow] = await db
          .select({ count: sql`COUNT(*)`.as("count") })
          .from(queues)
          .where(eq(queues.user_id, admin.id));
        return {
          ...admin,
          queue_count: Number(queueCountRow?.count || 0),
        };
      })
    );

    return sendSuccess(res, "Daftar admin berhasil didapatkan.", {
      admins: adminsWithQueueCount,
      meta: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
        search: search || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminDetail = async (req, res, next) => {
  try {
    const { id: adminId } = req.valid.params;

    const [admin] = await db
      .select({
        id: users.id,
        nama: users.nama,
        email: users.email,
        role: users.role,
        is_active: users.is_active,
        created_at: users.created_at,
      })
      .from(users)
      .where(and(eq(users.id, adminId), eq(users.role, "admin")))
      .limit(1);

    if (!admin) {
      return sendError(res, "Admin tidak ditemukan.", null, 404);
    }

    const adminQueues = await db
      .select({
        id: queues.id,
        nama_antrean: queues.nama_antrean,
        deskripsi: queues.deskripsi,
        status: queues.status,
        created_at: queues.created_at,
      })
      .from(queues)
      .where(eq(queues.user_id, adminId))
      .orderBy(desc(queues.created_at));

    const queuesWithCount = await Promise.all(
      adminQueues.map(async (q) => {
        const [countRow] = await db
          .select({ count: sql`COUNT(*)`.as("count") })
          .from(queueEntries)
          .where(eq(queueEntries.queue_id, q.id));
        return { ...q, total_tickets: Number(countRow?.count || 0) };
      })
    );

    return sendSuccess(res, "Detail admin berhasil didapatkan.", {
      admin,
      queues: queuesWithCount,
      queue_count: queuesWithCount.length,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminStatus = async (req, res, next) => {
  try {
    const { id: adminId } = req.valid.params;
    const { is_active } = req.body;

    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, adminId))
      .limit(1);

    if (!existing) {
      return sendError(res, "Admin tidak ditemukan.", null, 404);
    }

    if (existing.role !== "admin") {
      return sendError(res, "Hanya akun dengan role admin yang dapat diubah statusnya.", null, 400);
    }

    if (existing.id === req.user.id) {
      return sendError(res, "Tidak dapat mengubah status akun sendiri.", null, 400);
    }

    const [updated] = await db
      .update(users)
      .set({ is_active })
      .where(eq(users.id, adminId))
      .returning({
        id: users.id,
        nama: users.nama,
        email: users.email,
        role: users.role,
        is_active: users.is_active,
        created_at: users.created_at,
      });

    return sendSuccess(
      res,
      `Status admin berhasil diubah menjadi ${is_active ? "aktif" : "nonaktif"}.`,
      { admin: updated }
    );
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const { id: adminId } = req.valid.params;

    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, adminId))
      .limit(1);

    if (!existing) {
      return sendError(res, "Admin tidak ditemukan.", null, 404);
    }

    if (existing.role !== "admin") {
      return sendError(res, "Hanya akun dengan role admin yang dapat dihapus.", null, 400);
    }

    if (existing.id === req.user.id) {
      return sendError(res, "Tidak dapat menghapus akun sendiri.", null, 400);
    }

    // Keamanan: tolak hapus jika masih memiliki antrean (mencegah cascade menghapus queue_entries)
    // Sesuai spec: lebih aman nonaktifkan daripada hapus. Delete hanya jika sudah tidak punya antrean.
    const [queueCountRow] = await db
      .select({ count: sql`COUNT(*)`.as("count") })
      .from(queues)
      .where(eq(queues.user_id, adminId));
    const queueCount = Number(queueCountRow?.count || 0);

    if (queueCount > 0) {
      return sendError(
        res,
        `Tidak dapat menghapus admin yang masih memiliki ${queueCount} antrean. Nonaktifkan akun atau hapus antreannya terlebih dahulu.`,
        { queue_count: queueCount },
        400
      );
    }

    await db.delete(users).where(eq(users.id, adminId));

    return sendSuccess(res, "Admin berhasil dihapus.", { deleted_admin_id: adminId });
  } catch (error) {
    next(error);
  }
};

export const listAllQueues = async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.valid.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(queues.status, status));
    if (search && search.trim() !== "") {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(queues.nama_antrean, term), ilike(queues.deskripsi, term)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql`COUNT(*)`.as("count") })
      .from(queues)
      .where(whereClause);
    const totalItems = Number(countRow?.count || 0);

    const allQueues = await db
      .select({
        id: queues.id,
        nama_antrean: queues.nama_antrean,
        deskripsi: queues.deskripsi,
        status: queues.status,
        qr_code_token: queues.qr_code_token,
        created_at: queues.created_at,
        user_id: queues.user_id,
        pemilik_nama: users.nama,
        pemilik_email: users.email,
      })
      .from(queues)
      .innerJoin(users, eq(queues.user_id, users.id))
      .where(whereClause)
      .orderBy(desc(queues.created_at))
      .limit(limit)
      .offset(offset);

    const queuesWithCount = await Promise.all(
      allQueues.map(async (q) => {
        const [countRow2] = await db
          .select({ count: sql`COUNT(*)`.as("count") })
          .from(queueEntries)
          .where(eq(queueEntries.queue_id, q.id));
        return {
          ...q,
          total_peserta: Number(countRow2?.count || 0),
        };
      })
    );

    return sendSuccess(res, "Daftar seluruh antrean berhasil didapatkan.", {
      queues: queuesWithCount,
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
