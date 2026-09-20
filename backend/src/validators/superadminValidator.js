import { z } from "zod";

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

export const adminIdParam = {
  params: z.object({
    id: z.coerce.number({ error: "ID admin harus berupa angka yang valid." }).int("ID admin harus berupa angka yang valid.").positive("ID admin harus berupa angka yang valid."),
  }),
};

export const adminStatusSchema = {
  params: z.object({
    id: z.coerce.number({ error: "ID admin harus berupa angka yang valid." }).int("ID admin harus berupa angka yang valid.").positive("ID admin harus berupa angka yang valid."),
  }),
  body: z.object({
    is_active: z.boolean({ error: "is_active harus berupa boolean (true/false)." }),
  }),
};

export const adminListQuerySchema = {
  query: z.object({
    page: lenientPage(1),
    limit: lenientLimit(20),
    search: z.string().trim().optional().default(""),
  }),
};

export const superadminQueueListQuerySchema = {
  query: z.object({
    page: lenientPage(1),
    limit: lenientLimit(20),
    search: z.string().trim().optional().default(""),
    status: z
      .enum(["active", "paused", "closed"], {
        error: "Filter status tidak valid. Nilai yang diizinkan: active, paused, closed.",
      })
      .optional(),
  }),
};
