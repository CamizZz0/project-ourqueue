import rateLimit from "express-rate-limit";
import { sendError } from "../utils/response.js";

function tooManyRequests(message) {
  return (req, res) =>
    sendError(res, message, null, 429);
}

export const takeTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: tooManyRequests(
    "Terlalu banyak pengambilan tiket dari perangkat ini. Coba lagi dalam 15 menit."
  ),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: tooManyRequests(
    "Terlalu banyak percobaan autentikasi. Coba lagi dalam 15 menit."
  ),
});
