import { Router } from "express";
import {
  takeQueueEntry,
  getEntryByToken,
  updateEntryStatus,
} from "../controllers/entryController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Endpoint Publik untuk Peserta (Guest) Mengambil Nomor Antrean (Tanpa JWT)
router.post("/", takeQueueEntry);

// Endpoint Admin untuk Mengubah Status Tiket (Protected JWT + cek ownership)
// waiting -> calling (panggil) -> completed (selesai) / skipped / cancelled
// Path dua segmen (/:id/status) tidak bentrok dengan GET /:token satu segmen.
router.patch("/:id/status", verifyToken, updateEntryStatus);

// Endpoint Publik untuk Peserta Mengecek Status Tiket Antrean Mereka (Tanpa JWT)
router.get("/:token", getEntryByToken);

export default router;

