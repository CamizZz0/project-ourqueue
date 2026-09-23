import { z } from "zod";

export const pushSubscribeSchema = {
  body: z.object({
    participant_token: z.string().trim().min(1, "participant_token wajib."),
    subscription: z.object({
      endpoint: z.string().trim().min(1, "endpoint wajib."),
      expirationTime: z.any().optional().nullable(),
      keys: z.object({
        p256dh: z.string().trim().min(1, "p256dh wajib."),
        auth: z.string().trim().min(1, "auth wajib."),
      }),
    }),
  }),
};

export const pushUnsubscribeSchema = {
  body: z.object({
    participant_token: z.string().trim().min(1, "participant_token wajib."),
  }),
};
