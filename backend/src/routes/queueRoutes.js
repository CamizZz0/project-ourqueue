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
  resetQueue,
  regenerateQrToken,
  getQueueEntries,
} from "../controllers/queueController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/qr/:qrToken", getQueueByQrToken);

router.use(verifyToken);

router.get("/", getMyQueues);

router.post("/", createQueue);

router.get("/:id/entries", getQueueEntries);

router.get("/:id", getQueueDetailById);

router.put("/:id", updateQueue);

router.patch("/:id/status", updateQueueStatus);

router.post("/:id/call-next", callNextEntry);

router.post("/:id/recall", recallCurrentEntry);

router.post("/:id/reset", resetQueue);

router.post("/:id/regenerate-qr", regenerateQrToken);

router.delete("/:id", deleteQueue);

export default router;
