import { z } from "zod";
import { eventRegistrationSettingsSchema } from "./EventRegistrationSchemas";

export const eventSettingsFormSchema =
  eventRegistrationSettingsSchema.safeExtend({
    opensAt: z
      .string()
      .refine(
        (value) => !value || Number.isFinite(Date.parse(value)),
        "Enter a valid opening date.",
      ),
    closesAt: z
      .string()
      .refine(
        (value) => !value || Number.isFinite(Date.parse(value)),
        "Enter a valid closing date.",
      ),
  });
export type EventSettingsFormValues = z.infer<typeof eventSettingsFormSchema>;
export function eventSettingsTransport(values: EventSettingsFormValues) {
  return {
    ...values,
    opensAt: values.opensAt ? new Date(values.opensAt).toISOString() : null,
    closesAt: values.closesAt ? new Date(values.closesAt).toISOString() : null,
  };
}
export function localSettingsDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
