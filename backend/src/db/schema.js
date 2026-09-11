import { pgTable, serial, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Tabel Users (Pemilik / Admin Antrean)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Tabel Queues (Daftar Antrean yang dibuat oleh User)
export const queues = pgTable("queues", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  nama_antrean: varchar("nama_antrean", { length: 255 }).notNull(),
  deskripsi: text("deskripsi"),
  // enabled_fields: field apa saja yang perlu diisi peserta saat mendaftar antrean, misal: ["nama", "nomor_telepon"]
  enabled_fields: jsonb("enabled_fields").default(["nama", "nomor_telepon"]).notNull(),
  // qr_code_token: identifier unik antrean untuk pembuatan QR code / tautan publik
  qr_code_token: varchar("qr_code_token", { length: 255 }).notNull().unique(),
  // status: 'active', 'paused', 'closed'
  status: varchar("status", { length: 50 }).default("active").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Tabel Queue Entries (Data Peserta / Tiket Antrean)
export const queueEntries = pgTable("queue_entries", {
  id: serial("id").primaryKey(),
  queue_id: integer("queue_id")
    .references(() => queues.id, { onDelete: "cascade" })
    .notNull(),
  // data_peserta: menyimpan JSON data sesuai enabled_fields, misal: { nama: "Budi", nomor_telepon: "08123456789" }
  data_peserta: jsonb("data_peserta").notNull(),
  nomor_antrean: integer("nomor_antrean").notNull(),
  // status: 'waiting', 'calling', 'completed', 'skipped', 'cancelled'
  status: varchar("status", { length: 50 }).default("waiting").notNull(),
  // participant_token: token unik peserta untuk melihat live status tiket antrean mereka
  participant_token: varchar("participant_token", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relasi Drizzle ORM antar tabel
export const usersRelations = relations(users, ({ many }) => ({
  queues: many(queues),
}));

export const queuesRelations = relations(queues, ({ one, many }) => ({
  user: one(users, {
    fields: [queues.user_id],
    references: [users.id],
  }),
  entries: many(queueEntries),
}));

export const queueEntriesRelations = relations(queueEntries, ({ one }) => ({
  queue: one(queues, {
    fields: [queueEntries.queue_id],
    references: [queues.id],
  }),
}));

