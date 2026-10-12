import { z } from "zod";

export const eventEmailKeys = [
  "event.registration.confirmed",
  "event.registration.reminder",
] as const;
export const eventEmailContextSchema = z
  .object({
    eventId: z.number().int().positive(),
    registrationId: z.uuid(),
    title: z.string().min(1),
    slug: z.string().min(1),
    startsAt: z.string().min(1),
    endsAt: z.string().nullable(),
    timezone: z.string().min(1),
    location: z.string(),
  })
  .strict();
export const eventEmailFields = [
  "platformName",
  "recipientName",
  "brandingLogoUrl",
  "eventTitle",
  "eventTime",
  "eventLocation",
  "eventUrl",
] as const;
export const eventEmailCatalogue = {
  "event.registration.confirmed": {
    key: "event.registration.confirmed",
    catalogKey: "EVENTS",
    ruleEligibility: "SYSTEM_ONLY",
    contextSchema: eventEmailContextSchema,
  },
  "event.registration.reminder": {
    key: "event.registration.reminder",
    catalogKey: "EVENTS",
    ruleEligibility: "SYSTEM_ONLY",
    contextSchema: eventEmailContextSchema,
  },
} as const;
