import crypto from "crypto";
import { db } from "../config/database.js";
import { queues } from "../db/schema.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Controller untuk Membuat Antrean Baru (Create Queue)
 * Endpoint ini terproteksi JWT, user_id didapatkan dari req.user.id
 */
export const createQueue = async (req, res, next) => {
  try {
    const { nama_antrean, deskripsi, enabled_fields } = req.body;

    // 1. Validasi input wajib
    if (!nama_antrean || nama_antrean.trim() === "") {
      return sendError(res, "Nama antrean wajib diisi.", null, 400);
    }

    // 2. Ambil ID pengguna pembuat antrean dari payload JWT (yang disisipkan authMiddleware)
    const userId = req.user.id;

    // 3. Generate token unik acak untuk QR Code (16 karakter heksadesimal)
    // Contoh output: "a7c8f9b2d1e43c5b"
    const qrCodeToken = crypto.randomBytes(8).toString("hex");

    // 4. Tentukan field pendaftaran yang diaktifkan (default: nama dan nomor telepon)
    const fields =
      Array.isArray(enabled_fields) && enabled_fields.length > 0
        ? enabled_fields
        : ["nama", "nomor_telepon"];

    // 5. Simpan data antrean ke database
    const [newQueue] = await db
      .insert(queues)
      .values({
        user_id: userId,
        nama_antrean: nama_antrean.trim(),
        deskripsi: deskripsi ? deskripsi.trim() : null,
        enabled_fields: fields,
        qr_code_token: qrCodeToken,
        status: "active", // Status otomatis diset 'active' (buka)
      })
      .returning();

    return sendSuccess(
      res,
      "Antrean baru berhasil dibuat dan siap digunakan.",
      {
        queue: newQueue,
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

