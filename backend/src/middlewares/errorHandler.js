import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

export const errorHandler = (err, req, res, next) => {
  console.error("[Unhandled Error]:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errorDetails = env.NODE_ENV === "development" ? err.stack : null;

  return sendError(res, message, errorDetails, statusCode);
};

