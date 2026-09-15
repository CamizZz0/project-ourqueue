import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.js";
import { env } from "./env.js";

const connectionString = env.DATABASE_URL;

// Inisialisasi postgres connection pool
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Inisialisasi Drizzle ORM dengan schema
export const db = drizzle(client, { schema });

