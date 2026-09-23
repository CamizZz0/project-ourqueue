import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.js";
import { env } from "./env.js";

const connectionString = env.DATABASE_URL;

// Vercel serverless: kurangi pool biar tidak exhaust Neon (cold start)
const isServerless = !!process.env.VERCEL;
export const client = postgres(connectionString, {
  max: isServerless ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

// Inisialisasi Drizzle ORM dengan schema
export const db = drizzle(client, { schema });

