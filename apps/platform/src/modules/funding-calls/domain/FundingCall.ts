export const fundingCallStatuses = [
  "DRAFT",
  "SCHEDULED",
  "OPEN",
  "CLOSED",
  "CANCELLED",
] as const;

export type FundingCallStatus = (typeof fundingCallStatuses)[number];

export type FundingCall = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  description: string;
  fundingInstrument: string | null;
  thematicArea: string | null;
  totalBudgetEnvelope: string;
  minimumGrantAmount: string;
  maximumGrantAmount: string;
  opensAt: Date;
  closesAt: Date;
  status: FundingCallStatus;
  publicContactName: string | null;
  publicContactEmail: string | null;
  publicContactPhone: string | null;
  rowVersion: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};
