import express from "express";
import cors from "cors";
import helmet from "helmet";
import { sendSuccess, sendError } from "./utils/response.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { env } from "./config/env.js";

import authRoutes from "./routes/authRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import entryRoutes from "./routes/entryRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";
import pushRoutes from "./routes/pushRoutes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS.`));
    },
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

// Rute Manajemen Antrean (Protected dengan JWT)
app.use("/api/queues", queueRoutes);

// Rute Publik Pengambilan Tiket Peserta (Guest - Tanpa JWT)
app.use("/api/entries", entryRoutes);

// Rute Superadmin (Protected + role superadmin)
app.use("/api/superadmin", superadminRoutes);

// Rute Push Notifikasi (peserta - participant_token auth)
app.use("/api/push", pushRoutes);

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

