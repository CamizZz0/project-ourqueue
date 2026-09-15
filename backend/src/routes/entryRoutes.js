import { Router } from "express";
import {
  takeQueueEntry,
  getEntryByToken,
  updateEntryStatus,
  deleteEntry,
} from "../controllers/entryController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/", takeQueueEntry);

router.patch("/:id/status", verifyToken, updateEntryStatus);

router.delete("/:id", verifyToken, deleteEntry);

router.get("/:token", getEntryByToken);

export default router;
