import { Router } from "express";
import { getVapidPublic, getPushStatus, subscribePush, unsubscribePush } from "../controllers/pushController.js";
import { validate } from "../middlewares/validate.js";
import { pushSubscribeSchema, pushUnsubscribeSchema } from "../validators/pushValidator.js";

const router = Router();

router.get("/vapid-public", getVapidPublic);
router.get("/status/:participant_token", getPushStatus);
router.post("/subscribe", validate(pushSubscribeSchema), subscribePush);
router.post("/unsubscribe", validate(pushUnsubscribeSchema), unsubscribePush);

export default router;
