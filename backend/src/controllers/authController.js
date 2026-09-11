import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { users } from "../db/schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Controller untuk Registrasi User / Pembuat Antrean Baru
 */
export const register = async (req, res, next) => {
  try {
    const { nama, email, password } = req.body;

    // 1. Validasi input wajib
    if (!nama || !email || !password) {
      return sendError(
        res,
        "Nama, email, dan password wajib diisi.",
        null,
        400
      );
    }

    if (password.length < 6) {
      return sendError(
        res,
        "Password minimal terdiri dari 6 karakter.",
        null,
        400
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Cek apakah email sudah terdaftar sebelumnya
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return sendError(
        res,
        "Email ini sudah terdaftar. Silakan gunakan email lain atau login.",
        null,
        409
      );
    }

    // 3. Hash password menggunakan bcrypt dengan salt rounds = 10
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 4. Simpan user baru ke database
    const [newUser] = await db
      .insert(users)
      .values({
        nama: nama.trim(),
        email: normalizedEmail,
        password_hash,
      })
      .returning({
        id: users.id,
        nama: users.nama,
        email: users.email,
        created_at: users.created_at,
      });

    // 5. Generate token JWT untuk langsung masuk ke sesi login
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        nama: newUser.nama,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return sendSuccess(
      res,
      "Pendaftaran akun berhasil.",
      {
        user: newUser,
        token,
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Controller untuk Login User / Pembuat Antrean
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validasi input
    if (!email || !password) {
      return sendError(res, "Email dan password wajib diisi.", null, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Cari pengguna berdasarkan email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return sendError(
        res,
        "Email atau password yang Anda masukkan salah.",
        null,
        401
      );
    }

    // 3. Bandingkan password plain text dengan password_hash di database
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return sendError(
        res,
        "Email atau password yang Anda masukkan salah.",
        null,
        401
      );
    }

    // 4. Buat token JWT jika password cocok
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nama: user.nama,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return sendSuccess(res, "Login berhasil.", {
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller untuk Mengambil Data Profil Pengguna yang Sedang Login
 */
export const getMe = async (req, res, next) => {
  try {
    const [currentUser] = await db
      .select({
        id: users.id,
        nama: users.nama,
        email: users.email,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!currentUser) {
      return sendError(res, "Pengguna tidak ditemukan.", null, 404);
    }

    return sendSuccess(res, "Data profil berhasil didapatkan.", {
      user: currentUser,
    });
  } catch (error) {
    next(error);
  }
};

