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
import { validate } from "../middlewares/validate.js";
import {
  queueIdParam,
  qrTokenParam,
  createQueueSchema,
  updateQueueSchema,
  queueStatusSchema,
  queueListQuerySchema,
  queueEntriesQuerySchema,
  recallSchema,
} from "../validators/queueValidator.js";

const router = Router();

router.get("/qr/:qrToken", validate(qrTokenParam), getQueueByQrToken);

router.use(verifyToken);

router.get("/", validate(queueListQuerySchema), getMyQueues);

router.post("/", validate(createQueueSchema), createQueue);

router.get("/:id/entries", validate(queueEntriesQuerySchema), getQueueEntries);

router.get("/:id", validate(queueIdParam), getQueueDetailById);

router.put("/:id", validate(updateQueueSchema), updateQueue);

router.patch("/:id/status", validate(queueStatusSchema), updateQueueStatus);

router.post("/:id/call-next", validate(queueIdParam), callNextEntry);

router.post("/:id/recall", validate(recallSchema), recallCurrentEntry);

router.post("/:id/reset", validate(queueIdParam), resetQueue);

router.post("/:id/regenerate-qr", validate(queueIdParam), regenerateQrToken);

router.delete("/:id", validate(queueIdParam), deleteQueue);

export default router;
