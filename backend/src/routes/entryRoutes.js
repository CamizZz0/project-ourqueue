import { Router } from "express";
import { takeQueueEntry, getEntryByToken } from "../controllers/entryController.js";

const router = Router();

// Endpoint Publik untuk Peserta (Guest) Mengambil Nomor Antrean (Tanpa JWT)
router.post("/", takeQueueEntry);

// Endpoint Publik untuk Peserta Mengecek Status Tiket Antrean Mereka (Tanpa JWT)
router.get("/:token", getEntryByToken);

export default router;

