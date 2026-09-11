import { Router } from "express";
import { createQueue } from "../controllers/queueController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Semua rute di queueRoutes dilindungi oleh autentikasi JWT
router.use(verifyToken);

// Endpoint Membuat Antrean Baru
router.post("/", createQueue);

export default router;

