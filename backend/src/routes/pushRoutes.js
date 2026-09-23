import { Router } from "express";
import { getVapidPublic, getPushStatus, subscribePush, unsubscribePush, sendTestPush } from "../controllers/pushController.js";
import { pushTestLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "../validators/pushValidator.js";

const router = Router();

router.get("/vapid-public", getVapidPublic);
router.get("/status/:participant_token", getPushStatus);
router.post("/subscribe", validate(pushSubscribeSchema), subscribePush);
router.post("/test", pushTestLimiter, sendTestPush);
router.post("/unsubscribe", validate(pushUnsubscribeSchema), unsubscribePush);

export default router;
