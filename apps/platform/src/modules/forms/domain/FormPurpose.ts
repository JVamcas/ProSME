export const formPurposes = [
  "FUNDING_APPLICATION",
  "APPLICATION_REVIEW",
  "ELIGIBILITY_VERIFICATION",
  "COI",
  "RFI",
  "OTHER",
] as const;

export type FormPurpose = (typeof formPurposes)[number];

export const formPurposeOptions = [
  { label: "Funding call application", value: "FUNDING_APPLICATION" },
  { label: "Application review", value: "APPLICATION_REVIEW" },
  { label: "Eligibility verification", value: "ELIGIBILITY_VERIFICATION" },
  { label: "Conflict of interest", value: "COI" },
  { label: "Request for information", value: "RFI" },
  { label: "Other", value: "OTHER" },
] as const;

export function standardFormPurpose(code: string): FormPurpose {
  if (code === "FUNDING_APPLICATION") return "FUNDING_APPLICATION";
  if (code === "ELIGIBILITY_VERIFICATION") return "ELIGIBILITY_VERIFICATION";
  if (code === "COI_DECLARATION") return "COI";
  if (code === "APPEAL_SUBMISSION" || code === "TRANCHE_CLAIM") return "OTHER";
  return "APPLICATION_REVIEW";
}
