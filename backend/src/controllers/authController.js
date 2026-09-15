import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { env } from "../config/env.js";
import { users } from "../db/schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

export const register = async (req, res, next) => {
  try {
    const { nama, email, password } = req.body;

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return sendError(
        res,
        "Email ini sudah terdaftar. Silakan gunakan email lain atau login.",
        null,
        409
      );
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const [newUser] = await db
      .insert(users)
      .values({
        nama: nama.trim(),
        email,
        password_hash,
      })
      .returning({
        id: users.id,
        nama: users.nama,
        email: users.email,
        created_at: users.created_at,
      });

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

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return sendError(
        res,
        "Email atau password yang Anda masukkan salah.",
        null,
        401
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return sendError(
        res,
        "Email atau password yang Anda masukkan salah.",
        null,
        401
      );
    }

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


