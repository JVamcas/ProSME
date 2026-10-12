import { z } from "zod";

export const eventIdSchema = z.coerce.number().int().positive().max(2147483647);

export const eventRegistrationSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    email: z
      .email()
      .trim()
      .max(320)
      .transform((value) => value.toLowerCase()),
    organisation: z.string().trim().max(200).optional().default(""),
    emailConsent: z.boolean().refine((value) => value, {
      message:
        "Agree to receive confirmation and reminder emails for this event.",
    }),
  })
  .strict();

export const eventRegistrationSettingsSchema = z
  .object({
    enabled: z.boolean(),
    opensAt: z.iso.datetime({ offset: true }).nullable(),
    closesAt: z.iso.datetime({ offset: true }).nullable(),
    confirmationEnabled: z.boolean(),
    reminderEnabled: z.boolean(),
    reminderHours: z.number().int().min(1).max(168),
  })
  .strict()
  .refine(
    (value) =>
      !value.opensAt ||
      !value.closesAt ||
      Date.parse(value.opensAt) < Date.parse(value.closesAt),
    { path: ["closesAt"], message: "Closing must be after opening." },
  );

export const eventParticipantQuerySchema = z
  .object({
    search: z.string().trim().max(200).default(""),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;
export type EventSettingsInput = z.infer<
  typeof eventRegistrationSettingsSchema
>;
export type EventParticipantQuery = z.infer<typeof eventParticipantQuerySchema>;
