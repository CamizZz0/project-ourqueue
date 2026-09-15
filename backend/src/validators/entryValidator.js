import { z } from "zod";

const ID_TIKET_MSG = "ID tiket harus berupa angka yang valid.";
const ENTRY_STATUSES = ["waiting", "calling", "completed", "skipped", "cancelled"];

export const entryIdParam = {
  params: z.object({
    id: z.coerce.number({ error: ID_TIKET_MSG }).int(ID_TIKET_MSG),
  }),
};

export const participantTokenParam = {
  params: z.object({
    token: z.string().trim().min(1, "Participant token wajib disertakan."),
  }),
};

export const takeEntrySchema = {
  body: z.object({
    queue_id: z
      .any()
      .refine((v) => v !== undefined && v !== null && v !== "", {
        message: "ID antrean (queue_id) wajib disertakan.",
      })
      .pipe(
        z.coerce
          .number({
            error: "ID antrean (queue_id) harus berupa angka yang valid.",
          })
          .int("ID antrean (queue_id) harus berupa angka yang valid.")
      ),
    data_peserta: z
      .record(z.string(), z.any(), {
        error: "Data peserta (data_peserta) wajib diisi.",
      })
      .refine((o) => Object.keys(o).length > 0, {
        message: "Data peserta (data_peserta) wajib diisi.",
      }),
  }),
};

export const entryStatusSchema = {
  params: entryIdParam.params,
  body: z.object({
    status: z.enum(ENTRY_STATUSES, {
      error: `Status tidak valid. Nilai yang diizinkan: ${ENTRY_STATUSES.join(", ")}.`,
    }),
  }),
};
