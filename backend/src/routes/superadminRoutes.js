import { Router } from "express";
import {
  getStats,
  listAdmins,
  getAdminDetail,
  updateAdminStatus,
  deleteAdmin,
  listAllQueues,
} from "../controllers/superadminController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validate } from "../middlewares/validate.js";
import {
  adminIdParam,
  adminStatusSchema,
  adminListQuerySchema,
  superadminQueueListQuerySchema,
} from "../validators/superadminValidator.js";

const router = Router();

// Semua endpoint superadmin butuh JWT + role superadmin
router.use(verifyToken, requireRole("superadmin"));

router.get("/stats", getStats);

router.get("/admins", validate(adminListQuerySchema), listAdmins);

router.get("/admins/:id", validate(adminIdParam), getAdminDetail);

router.patch("/admins/:id/status", validate(adminStatusSchema), updateAdminStatus);

router.delete("/admins/:id", validate(adminIdParam), deleteAdmin);

router.get("/queues", validate(superadminQueueListQuerySchema), listAllQueues);

export default router;
