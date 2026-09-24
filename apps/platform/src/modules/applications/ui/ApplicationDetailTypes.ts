import type { ApplicationReadSection } from "../domain/ApplicationReadAnswers";

export type ApplicationDetailModel = {
  title: string;
  backHref: string;
  backLabel: string;
  reference: string | null;
  statusLabel: string;
  statusBadgeLabel: string;
  statusDescription: string;
  submittedAt: string | null;
  updatedAt: string | null;
  facts: { label: string; value: string }[];
  sections: ApplicationReadSection[];
  documents: {
    key: string;
    name: string;
    type: string;
    sizeBytes: number;
    href: string | null;
  }[];
  applicantDetails: { label: string; value: string }[];
  businessDetails: { label: string; value: string }[];
};
