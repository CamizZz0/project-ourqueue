import { sendError } from "../utils/response.js";

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error("[Unhandled Error]:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errorDetails = process.env.NODE_ENV === "development" ? err.stack : null;

  return sendError(res, message, errorDetails, statusCode);
};

