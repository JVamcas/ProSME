export type ChatbotResourceType = "funding" | "eligibility" | "faq" | "contact";

export type ChatbotResource = {
  key: string;
  name: string;
  url: string;
  type: ChatbotResourceType;
  active: boolean;
  lastUpdated: string | null;
};

export type ChatbotResourcePage = {
  items: ChatbotResource[];
  page: number;
  pageSize: number;
  total: number;
};
