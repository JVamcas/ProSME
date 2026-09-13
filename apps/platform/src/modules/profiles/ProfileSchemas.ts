import { z } from "zod";

const requiredText = (label: string, maximum = 120) =>
  z.string().trim().min(1, `${label} is required`).max(maximum);

const optionalText = (maximum = 160) => z.string().trim().max(maximum);

function isPastCalendarDate(value: string) {
  if (value === "") {
    return true;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date()
  );
}

export const applicantPersonalProfileSchema = z.object({
  firstName: requiredText("First name", 80),
  surname: requiredText("Surname", 80),
  position: requiredText("Position", 120),
  dateOfBirth: optionalText(10).refine(isPastCalendarDate, "Use a valid past date"),
  nationality: requiredText("Nationality", 80),
  region: requiredText("Region", 80),
});

export const applicantContactProfileSchema = z.object({
  phoneNumber: requiredText("Phone number", 30),
  postalAddress: optionalText(240),
});

export const applicantProfileSchema = applicantPersonalProfileSchema.merge(
  applicantContactProfileSchema,
);

export const applicantProfileUpdateSchema = z.discriminatedUnion("section", [
  z.object({
    section: z.literal("personal"),
    data: applicantPersonalProfileSchema,
  }),
  z.object({
    section: z.literal("contact"),
    data: applicantContactProfileSchema,
  }),
]);

export type ApplicantProfileInput = z.infer<typeof applicantProfileSchema>;
export type ApplicantPersonalProfileInput = z.infer<
  typeof applicantPersonalProfileSchema
>;
export type ApplicantContactProfileInput = z.infer<
  typeof applicantContactProfileSchema
>;
export type ApplicantProfileUpdateInput = z.infer<
  typeof applicantProfileUpdateSchema
>;
