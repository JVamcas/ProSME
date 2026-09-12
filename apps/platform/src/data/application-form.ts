import type { FieldPath } from "react-hook-form";

import type { ApplicationValues } from "./application-schema";

export const applicationStepFields: FieldPath<ApplicationValues>[][] = [
  ["firstName", "lastName", "email", "phone", "gender", "age", "nationality"],
  ["businessName", "registrationNumber", "position", "yearsOperating", "annualTurnover", "employees", "sector", "region", "exportReady"],
  ["amountRequested", "useOfFunds", "expectedOutcomes", "jobs"],
  [],
  ["declaration", "consent"],
];

export const applicationDocuments = [
  ["bipa", "BIPA business registration"],
  ["namra", "NAMRA Good Standing Certificate"],
  ["ssc", "Social Security Good Standing Certificate"],
  ["msme", "Valid MSME Certificate"],
  ["police", "Police clearance or proof of application"],
  ["bank", "Bank confirmation letter or statement"],
  ["profile", "Business profile (maximum 5 pages)"],
  ["pitch", "Pitch deck (maximum 12 slides)"],
] as const;

export const regions = [
  "Erongo", "Hardap", "//Kharas", "Kavango East", "Kavango West", "Khomas", "Kunene",
  "Ohangwena", "Omaheke", "Omusati", "Oshana", "Oshikoto", "Otjozondjupa", "Zambezi",
];

function selectItems(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

export const genderItems = selectItems([
  "Female",
  "Male",
  "Prefer not to say",
]);

export const yearsOperatingItems = selectItems([
  "1–2 years",
  "2–3 years",
  "3–5 years",
  "More than 5 years",
]);

export const annualTurnoverItems = selectItems([
  "Up to N$250,000",
  "N$250,001–N$500,000",
  "N$500,001–N$1,000,000",
  "Above N$1,000,000",
]);

export const sectorItems = selectItems([
  "Agro-processing",
  "Agriculture",
  "Manufacturing",
  "Tourism",
  "Technology",
  "Renewable energy",
  "Creative industries",
  "Other",
]);

export const regionItems = selectItems(regions);

export const exportReadinessItems = selectItems([
  "Ready to expand locally",
  "Preparing for regional export",
  "Already exporting",
  "Seeking investment opportunities",
]);
