import jwt from "jsonwebtoken";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

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

    const token = authHeader.split(" ")[1];

    if (!token) {
      return sendError(res, "Token autentikasi tidak valid.", null, 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

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

