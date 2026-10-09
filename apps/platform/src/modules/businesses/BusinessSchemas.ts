import { z } from "zod";
import {
  isBusinessSectorChoice,
  otherBusinessSector,
} from "./domain/BusinessSectors";

const requiredText = (label: string, maximum = 120) =>
  z.string().trim().min(1, `${label} is required`).max(maximum);

function isReasonableEstablishedYear(value: string) {
  if (value === "") return true;
  const year = Number(value);
  return (
    /^\d{4}$/.test(value) && year >= 1800 && year <= new Date().getFullYear()
  );
}

export const businessProfileSchema = z
  .object({
    legalName: requiredText("Legal business name"),
    tradingName: requiredText("Trading name", 160),
    registrationNumber: requiredText("Registration number", 80),
    businessType: requiredText("Business type", 80),
    sector: requiredText("Primary sector", 120).refine(
      isBusinessSectorChoice,
      "Select a primary sector",
    ),
    sectorOther: z.string().trim().max(120).optional(),
    secondarySector: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || isBusinessSectorChoice(value),
        "Select a secondary sector from the list",
      )
      .optional(),
    secondarySectorOther: z.string().trim().max(120).optional(),
    region: requiredText("Region", 80),
    physicalAddress: requiredText("Physical address", 240),
    establishedYear: requiredText("Year established", 4).refine(
      isReasonableEstablishedYear,
      "Enter a valid year",
    ),
    employeeCount: requiredText("Number of employees")
      .refine(
        (value) => value === "" || /^\d+$/.test(value),
        "Enter a whole number",
      )
      .refine(
        (value) => value === "" || Number(value) <= 1_000_000,
        "Enter 1,000,000 or fewer employees",
      ),
  })
  .superRefine((input, context) => {
    if (input.sector === otherBusinessSector && !input.sectorOther) {
      context.addIssue({
        code: "custom",
        path: ["sectorOther"],
        message: "Please specify the primary sector",
      });
    }
    if (
      input.secondarySector === otherBusinessSector &&
      !input.secondarySectorOther
    ) {
      context.addIssue({
        code: "custom",
        path: ["secondarySectorOther"],
        message: "Please specify the secondary sector",
      });
    }
  });

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
