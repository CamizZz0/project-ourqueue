import jwt from "jsonwebtoken";
import { sendError } from "../utils/response.js";

/**
 * Middleware untuk memverifikasi JWT token dari header Authorization
 * Format header yang diharapkan: "Bearer <token>"
 */
export const verifyToken = (req, res, next) => {
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

    // Ambil token setelah kata 'Bearer '
    const token = authHeader.split(" ")[1];

    if (!token) {
      return sendError(res, "Token autentikasi tidak valid.", null, 401);
    }

    const secret = process.env.JWT_SECRET || "default_jwt_secret_key";
    const decoded = jwt.verify(token, secret);

    // Simpan data user yang sudah di-decode ke req.user agar bisa diakses di controller berikutnya
    req.user = decoded;
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

