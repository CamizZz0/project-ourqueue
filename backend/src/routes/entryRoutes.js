import { Router } from "express";
import {
  takeQueueEntry,
  getEntryByToken,
  updateEntryStatus,
  deleteEntry,
} from "../controllers/entryController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { takeTicketLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import {
  entryIdParam,
  participantTokenParam,
  takeEntrySchema,
  entryStatusSchema,
} from "../validators/entryValidator.js";

const router = Router();

router.post("/", takeTicketLimiter, validate(takeEntrySchema), takeQueueEntry);

router.patch("/:id/status", verifyToken, validate(entryStatusSchema), updateEntryStatus);

router.delete("/:id", verifyToken, validate(entryIdParam), deleteEntry);

router.get("/:token", validate(participantTokenParam), getEntryByToken);

export default router;
