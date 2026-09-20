import jwt from "jsonwebtoken";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(
        res,
        "Akses ditolak. Token autentikasi tidak ditemukan.",
        null,
        401
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return sendError(res, "Token autentikasi tidak valid.", null, 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Verifikasi status akun di database agar token lama tidak bisa dipakai jika akun dinonaktifkan
    const { db } = await import("../config/database.js");
    const { users } = await import("../db/schema.js");
    const { eq } = await import("drizzle-orm");
    const [dbUser] = await db
      .select({ id: users.id, role: users.role, is_active: users.is_active })
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!dbUser) {
      return sendError(res, "Akun tidak ditemukan.", null, 401);
    }

    if (dbUser.is_active === false) {
      return sendError(
        res,
        "Akun Anda telah dinonaktifkan. Hubungi Superadmin.",
        null,
        403
      );
    }

    // Gabungkan payload JWT dengan data aktual dari DB untuk memastikan role terbaru
    req.user = { ...decoded, role: dbUser.role, is_active: dbUser.is_active };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(
        res,
        "Sesi Anda telah kedaluwarsa. Silakan login kembali.",
        null,
        401
      );
    }
    return sendError(res, "Token tidak valid atau telah dimodifikasi.", null, 401);
  }
};

