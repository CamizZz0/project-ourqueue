import { sendError } from "../utils/response.js";

/**
 * Middleware authorization berbasis role.
 * Harus dipakai setelah verifyToken.
 * Contoh: requireRole("superadmin")
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return sendError(
        res,
        `Akses ditolak. Membutuhkan role: ${roles.join(", ")}.`,
        null,
        403
      );
    }
    next();
  };
};

export default requireRole;
