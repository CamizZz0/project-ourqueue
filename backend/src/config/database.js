import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("FATAL: DATABASE_URL environment variable is not defined.");
  process.exit(1);
}

// Inisialisasi postgres connection pool
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Inisialisasi Drizzle ORM dengan schema
export const db = drizzle(client, { schema });

