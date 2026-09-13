import { z } from "zod";

const requiredText = (label: string, maximum = 120) =>
  z.string().trim().min(1, `${label} is required`).max(maximum);

const optionalText = (maximum = 160) => z.string().trim().max(maximum);

function isReasonableEstablishedYear(value: string) {
  if (value === "") return true;
  const year = Number(value);
  return /^\d{4}$/.test(value) && year >= 1800 && year <= new Date().getFullYear();
}

export const businessProfileSchema = z.object({
  legalName: requiredText("Legal business name"),
  tradingName: optionalText(),
  registrationNumber: optionalText(80),
  businessType: requiredText("Business type", 80),
  sector: requiredText("Sector", 120),
  region: requiredText("Region", 80),
  physicalAddress: requiredText("Physical address", 240),
  establishedYear: z.string().trim().refine(
    isReasonableEstablishedYear,
    "Enter a valid year",
  ),
  employeeCount: z.string().trim().refine(
    (value) => value === "" || /^\d+$/.test(value),
    "Enter a whole number",
  ).refine(
    (value) => value === "" || Number(value) <= 1_000_000,
    "Enter 1,000,000 or fewer employees",
  ),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
