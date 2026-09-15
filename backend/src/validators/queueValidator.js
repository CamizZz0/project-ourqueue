import { z } from "zod";

const ID_ANTRIAN_MSG = "ID antrean harus berupa angka yang valid.";
const QUEUE_STATUSES = ["active", "paused", "closed"];
const ENTRY_STATUSES = ["waiting", "calling", "completed", "skipped", "cancelled"];

const lenientPage = (def) =>
  z.preprocess(
    (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 ? n : def;
    },
    z.number().int().min(1).default(def)
  );

const lenientLimit = (def) =>
  z.preprocess(
    (v) => {
      const n = Number(v);
      if (!Number.isInteger(n)) return def;
      return Math.min(Math.max(n, 1), 100);
    },
    z.number().int().min(1).max(100).default(def)
  );

export const queueIdParam = {
  params: z.object({
    id: z.coerce.number({ error: ID_ANTRIAN_MSG }).int(ID_ANTRIAN_MSG),
  }),
};

export const qrTokenParam = {
  params: z.object({
    qrToken: z.string().trim().min(1, "QR token wajib disertakan."),
  }),
};

export const createQueueSchema = {
  body: z.object({
    nama_antrean: z
      .string({ error: "Nama antrean wajib diisi." })
      .trim()
      .min(1, "Nama antrean wajib diisi."),
    deskripsi: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) =>
        typeof v === "string" ? v.trim() || null : null
      ),
    enabled_fields: z
      .array(z.string(), {
        error:
          'enabled_fields harus berupa array non-kosong, misal: ["nama", "nomor_telepon"].',
      })
      .min(
        1,
        'enabled_fields harus berupa array non-kosong, misal: ["nama", "nomor_telepon"].'
      )
      .optional()
      .default(["nama", "nomor_telepon"]),
  }),
};

export const updateQueueSchema = {
  params: queueIdParam.params,
  body: z
    .object({
      nama_antrean: z
        .string({ error: "Nama antrean tidak boleh kosong." })
        .trim()
        .min(1, "Nama antrean tidak boleh kosong.")
        .optional(),
      deskripsi: z.union([z.string(), z.null()]).optional(),
      enabled_fields: z
        .array(z.string(), {
          error:
            'enabled_fields harus berupa array non-kosong, misal: ["nama", "nomor_telepon"].',
        })
        .min(
          1,
          'enabled_fields harus berupa array non-kosong, misal: ["nama", "nomor_telepon"].'
        )
        .optional(),
    })
    .refine((o) => Object.keys(o).length > 0, {
      message: "Tidak ada field yang diubah.",
    }),
};

export const queueStatusSchema = {
  params: queueIdParam.params,
  body: z.object({
    status: z.enum(QUEUE_STATUSES, {
      error: `Status tidak valid. Nilai yang diizinkan: ${QUEUE_STATUSES.join(", ")}.`,
    }),
  }),
};

export const queueListQuerySchema = {
  query: z.object({
    page: lenientPage(1),
    limit: lenientLimit(20),
    search: z.string().trim().optional().default(""),
    status: z
      .enum(QUEUE_STATUSES, {
        error: `Filter status tidak valid. Nilai yang diizinkan: ${QUEUE_STATUSES.join(", ")}.`,
      })
      .optional(),
  }),
};

export const queueEntriesQuerySchema = {
  params: queueIdParam.params,
  query: z.object({
    page: lenientPage(1),
    limit: lenientLimit(50),
    status: z
      .enum(ENTRY_STATUSES, {
        error: `Filter status tidak valid. Nilai yang diizinkan: ${ENTRY_STATUSES.join(", ")}.`,
      })
      .optional(),
  }),
};

export const recallSchema = {
  params: queueIdParam.params,
  body: z.object({
    entry_id: z.coerce
      .number({ error: "entry_id harus berupa angka yang valid." })
      .int("entry_id harus berupa angka yang valid.")
      .positive("entry_id harus berupa angka yang valid.")
      .optional(),
  }),
};
