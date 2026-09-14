import { z } from "zod";

export const documentTypeIds = [
  "business-registration",
  "financial-statements",
  "project-proposal",
  "tax-clearance",
  "director-identification",
] as const;

export const applicationDocumentTypeSchema = z.enum(documentTypeIds);

export const applicationDocumentRequirements = [
  {
    acceptedTypes: "PDF, JPG or PNG (max 10 MB)",
    id: "business-registration",
    label: "Business Registration Certificate",
    required: true,
  },
  {
    acceptedTypes: "PDF, JPG or PNG (max 10 MB)",
    id: "financial-statements",
    label: "Latest Financial Statements",
    required: true,
  },
  {
    acceptedTypes: "PDF, JPG or DOCX (max 10 MB)",
    id: "project-proposal",
    label: "Project Proposal",
    required: true,
  },
  {
    acceptedTypes: "PDF, JPG or PNG (max 10 MB)",
    id: "tax-clearance",
    label: "Tax Clearance Certificate",
    required: false,
  },
  {
    acceptedTypes: "PDF, JPG or PNG (max 10 MB)",
    id: "director-identification",
    label: "ID/Passport of Directors",
    required: false,
  },
] as const;

export type ApplicationDocumentType = z.infer<
  typeof applicationDocumentTypeSchema
>;

export type ApplicationDocumentView = {
  contentType: string;
  documentType: ApplicationDocumentType;
  fileName: string;
  id: string;
  scanStatus: "pending" | "clean" | "rejected";
  sizeBytes: number;
  uploadedAt: string;
};
