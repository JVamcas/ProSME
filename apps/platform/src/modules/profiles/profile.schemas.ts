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

function isReasonableEstablishedYear(value: string) {
  if (value === "") {
    return true;
  }

  const year = Number(value);
  return (
    /^\d{4}$/.test(value) &&
    year >= 1800 &&
    year <= new Date().getFullYear()
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

export const businessProfileSchema = z.object({
  legalName: requiredText("Legal business name"),
  tradingName: optionalText(),
  registrationNumber: optionalText(80),
  businessType: requiredText("Business type", 80),
  sector: requiredText("Sector", 120),
  region: requiredText("Region", 80),
  physicalAddress: requiredText("Physical address", 240),
  establishedYear: z
    .string()
    .trim()
    .refine(isReasonableEstablishedYear, "Enter a valid year"),
  employeeCount: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "Enter a whole number",
    )
    .refine(
      (value) => value === "" || Number(value) <= 1_000_000,
      "Enter 1,000,000 or fewer employees",
    ),
});

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
export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
