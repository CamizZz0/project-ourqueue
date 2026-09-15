import { Router } from "express";
import {
  createQueue,
  getMyQueues,
  getQueueByQrToken,
  getQueueDetailById,
  updateQueue,
  updateQueueStatus,
  deleteQueue,
  callNextEntry,
  recallCurrentEntry,
  getQueueEntries,
} from "../controllers/queueController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

// Public: resolve QR token -> info antrean (tanpa JWT).
// Didefinisikan SEBELUM verifyToken agar tidak terproteksi,
// dan SEBELUM "/:id" agar tidak tertangkap param generik.
router.get("/qr/:qrToken", getQueueByQrToken);

// Semua rute di bawah ini dilindungi autentikasi JWT
router.use(verifyToken);

// Daftar antrean milik user yang login
router.get("/", getMyQueues);

// Membuat antrean baru
router.post("/", createQueue);

// Daftar peserta dalam satu antrean (harus sebelum "/:id" generik jika ada)
router.get("/:id/entries", getQueueEntries);

// Detail satu antrean milik user
router.get("/:id", getQueueDetailById);

// Edit data antrean (nama, deskripsi, enabled_fields)
router.put("/:id", updateQueue);

// Ubah status antrean: active | paused | closed
router.patch("/:id/status", updateQueueStatus);

// Panggil nomor berikutnya secara atomik (calling lama -> completed)
router.post("/:id/call-next", callNextEntry);

// Panggil ulang nomor calling aktif tanpa mengubah status
router.post("/:id/recall", recallCurrentEntry);

// Hapus antrean beserta tiketnya
router.delete("/:id", deleteQueue);

export default router;

