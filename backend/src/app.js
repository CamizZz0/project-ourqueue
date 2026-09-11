import express from "express";
import cors from "cors";
import { sendSuccess, sendError } from "./utils/response.js";
import { errorHandler } from "./middlewares/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";

const app = express();

// Konfigurasi CORS agar siap dihubungkan dengan Front-End (React/Vite dll)
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware parsing body request JSON & URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rute Autentikasi
app.use("/api/auth", authRoutes);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  return sendSuccess(res, "OurQueue API is up and running healthy", {
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Endpoint default info
app.get("/", (req, res) => {
  return sendSuccess(res, "Welcome to OurQueue Backend API");
});

// Handler untuk route yang tidak ditemukan (404 Not Found)
app.use((req, res) => {
  return sendError(res, `Route ${req.originalUrl} not found`, null, 404);
});

// Global Error Handler
app.use(errorHandler);

export default app;

