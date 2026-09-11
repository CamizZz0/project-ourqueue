import { Router } from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Endpoint Registrasi Pengguna Baru
router.post("/register", register);

// Endpoint Login Pengguna
router.post("/login", login);

// Endpoint Cek Profil Pengguna Terautentikasi (dilindungi verifyToken)
router.get("/me", verifyToken, getMe);

export default router;

