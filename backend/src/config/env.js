import "dotenv/config";

// Catatan: JANGAN pakai process.exit(1) di sini.
// Di Vercel (serverless) process.exit mematikan invocation tanpa error yang jelas,
// jadi kita lempar Error supaya muncul di log function + response 500 yang bisa dilacak.
function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `FATAL: environment variable ${name} belum diset. Di Vercel: Project Settings → Environment Variables.`
    );
  }
  return value.trim();
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function boolean(name, fallback) {
  const value = optional(name, null);
  if (value === null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function requiredSecret(name, minLength) {
  const secret = required(name);
  if (secret.length < minLength) {
    throw new Error(`FATAL: ${name} minimal ${minLength} karakter.`);
  }
  return secret;
}

export const env = {
  NODE_ENV: optional("NODE_ENV", "development"),
  PORT: Number(optional("PORT", "5001")) || 5001,
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: requiredSecret("JWT_SECRET", 32),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "7d"),
  JWT_REMEMBER_EXPIRES_IN: optional("JWT_REMEMBER_EXPIRES_IN", "30d"),
  CLIENT_ORIGINS: optional("CLIENT_ORIGIN", "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Frontend yang dideploy di Vercel (production maupun preview) otomatis diizinkan.
  // Set ALLOW_VERCEL_PREVIEWS=false kalau mau membatasi hanya ke CLIENT_ORIGIN.
  ALLOW_VERCEL_PREVIEWS: boolean("ALLOW_VERCEL_PREVIEWS", true),
  SUPERADMIN_NAME: optional("SUPERADMIN_NAME", "Superadmin"),
  SUPERADMIN_EMAIL: optional("SUPERADMIN_EMAIL", "superadmin@ourqueue.local"),
  SUPERADMIN_PASSWORD: optional("SUPERADMIN_PASSWORD", "Superadmin123!"),
  VAPID_PUBLIC_KEY: optional("VAPID_PUBLIC_KEY", "BNxCkMWM6oyxVmqpNXop0MEBwiF9DjfwY8mJkqHfMdslAFjrF5sJr9SoZzvTzB3F6CMj_bG21kUHFj-UMmfHzmw"),
  VAPID_PRIVATE_KEY: optional("VAPID_PRIVATE_KEY", "tktWUS9tZJXL8IvljUGqKpoDKOfWPGWv1P8OQ3V9dm0"),
  VAPID_SUBJECT: optional("VAPID_SUBJECT", "mailto:superadmin@ourqueue.local"),
};
