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

// Vercel meneruskan request lewat 1 hop proxy (header X-Forwarded-For/Forwarded).
// Tanpa ini, express-rate-limit salah mengidentifikasi IP klien dan melempar
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR, plus semua user terbaca satu IP yang sama.
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

// Origin frontend di Vercel (production & preview) selalu berakhiran .vercel.app
const VERCEL_ORIGIN_PATTERN = /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i;

function isOriginAllowed(origin) {
  if (!origin) return true; // request non-browser (curl, health check, server-to-server)
  if (env.CLIENT_ORIGINS.includes(origin)) return true;
  if (env.ALLOW_VERCEL_PREVIEWS && VERCEL_ORIGIN_PATTERN.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      // Jangan lempar Error (dulu jadi 500 dan menutupi penyebab asli); cukup tolak
      // tanpa header CORS supaya browser memblokir dan alasannya kelihatan di log.
      console.error(
        `[CORS] Origin ditolak: ${origin}. Origin yang diizinkan: ${env.CLIENT_ORIGINS.join(", ")}${
          env.ALLOW_VERCEL_PREVIEWS ? " (+ semua subdomain *.vercel.app)" : ""
        }`
      );
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware parsing body request JSON & URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Respons API tidak boleh di-cache (browser/CDN) supaya polling status antrean
// peserta selalu mendapat data terbaru, bukan respons lama.
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

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

