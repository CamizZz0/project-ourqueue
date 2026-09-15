import { z } from "zod";

const REQUIRED_REGISTER = "Nama, email, dan password wajib diisi.";
const REQUIRED_LOGIN = "Email dan password wajib diisi.";

export const registerSchema = {
  body: z.object({
    nama: z.string({ error: REQUIRED_REGISTER }).trim().min(1, REQUIRED_REGISTER),
    email: z
      .string({ error: REQUIRED_REGISTER })
      .trim()
      .toLowerCase()
      .min(1, REQUIRED_REGISTER)
      .email("Format email tidak valid."),
    password: z
      .string({ error: REQUIRED_REGISTER })
      .min(6, "Password minimal terdiri dari 6 karakter."),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z
      .string({ error: REQUIRED_LOGIN })
      .trim()
      .toLowerCase()
      .min(1, REQUIRED_LOGIN),
    password: z.string({ error: REQUIRED_LOGIN }).min(1, REQUIRED_LOGIN),
  }),
};
