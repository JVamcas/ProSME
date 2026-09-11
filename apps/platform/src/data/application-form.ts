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
