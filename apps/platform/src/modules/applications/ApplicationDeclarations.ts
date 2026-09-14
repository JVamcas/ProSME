export const declarationVersion = "sme-fund-applicant-declaration-v1";
export const privacyNoticeVersion = "sme-fund-privacy-consent-v1";

export const applicationDeclarationItems = [
  {
    id: "informationAccuracy",
    text: "I confirm that all information provided is true and correct.",
  },
  {
    id: "falseInformation",
    text: "I understand that providing false information may result in disqualification.",
  },
  {
    id: "privacyConsent",
    text: "I consent to the processing of my personal and business information.",
  },
  {
    id: "compliance",
    text: "I confirm that my business complies with all applicable laws and regulations.",
  },
  {
    id: "terms",
    text: "I agree to the terms and conditions of the SME Fund.",
  },
] as const;
