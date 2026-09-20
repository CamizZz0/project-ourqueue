import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { env } from "../config/env.js";
import { users } from "./schema.js";

async function seedSuperadmin() {
  const name = env.SUPERADMIN_NAME;
  const email = env.SUPERADMIN_EMAIL;
  const password = env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error("[Seed] SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD tidak terdefinisi di .env");
    process.exit(1);
  }

  // Validasi password minimal 6 karakter (konsisten dengan authValidator)
  if (password.length < 6) {
    console.error("[Seed] SUPERADMIN_PASSWORD minimal 6 karakter.");
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    if (user.role === "superadmin") {
      console.log(`[Seed] Superadmin sudah ada: ${email} (id=${user.id}) - skip.`);
      process.exit(0);
    }
    // Jika email sudah dipakai role admin, upgrade menjadi superadmin dan aktifkan
    const [updated] = await db
      .update(users)
      .set({ role: "superadmin", is_active: true })
      .where(eq(users.id, user.id))
      .returning({ id: users.id, email: users.email, role: users.role });
    console.log(`[Seed] Akun existing di-upgrade menjadi superadmin: ${updated.email} (id=${updated.id}, role=${updated.role})`);
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      nama: name,
      email: email.toLowerCase(),
      password_hash,
      role: "superadmin",
      is_active: true,
    })
    .returning({ id: users.id, nama: users.nama, email: users.email, role: users.role });

  console.log(`[Seed] Superadmin berhasil dibuat: ${newUser.email} (id=${newUser.id}, role=${newUser.role})`);
  console.log(`[Seed] Login: email=${newUser.email} password=(dari env SUPERADMIN_PASSWORD)`);
  process.exit(0);
}

seedSuperadmin().catch((err) => {
  console.error("[Seed] Gagal:", err);
  process.exit(1);
});
