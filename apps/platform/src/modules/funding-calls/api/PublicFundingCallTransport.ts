export type PublicFundingCallStatus = "upcoming" | "open" | "closed";

export type PublicFundingCallListInput = {
  after?: string;
  limit: number;
  search?: string;
  status?: PublicFundingCallStatus;
};

export type PublicFundingCallContact = {
  email: string | null;
  name: string | null;
  phone: string | null;
};

export type PublicFundingCallDocument = {
  label: string;
  url: string;
};

export type PublicFundingCallSummary = {
  applicationsOpen: boolean;
  closesAt: string;
  fundingInstrument: string | null;
  id: string;
  maximumAmount: number;
  minimumAmount: number;
  opensAt: string;
  reference: string;
  selfCheckAvailable: boolean;
  slug: string;
  status: PublicFundingCallStatus;
  summary: string;
  summaryHtml?: string;
  thematicArea: string | null;
  title: string;
  totalFundingAmount: number;
};

export type PublicFundingCallDetail = PublicFundingCallSummary & {
  description: string;
  eligibilitySummary: string | null;
  publicContact: PublicFundingCallContact;
  publicDocuments: PublicFundingCallDocument[];
};

export type PublicFundingCallPage = {
  items: PublicFundingCallSummary[];
  nextCursor: string | null;
  total: number;
};
