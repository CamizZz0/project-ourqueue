import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`FATAL: ${name} environment variable is not defined.`);
    process.exit(1);
  }
  return value.trim();
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

export const env = {
  NODE_ENV: optional("NODE_ENV", "development"),
  PORT: Number(optional("PORT", "5001")) || 5001,
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: (() => {
    const secret = required("JWT_SECRET");
    if (secret.length < 32) {
      console.error("FATAL: JWT_SECRET must be at least 32 characters long.");
      process.exit(1);
    }
    return secret;
  })(),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "7d"),
  CLIENT_ORIGINS: optional("CLIENT_ORIGIN", "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};
