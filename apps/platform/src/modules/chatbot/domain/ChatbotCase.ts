import type { ConversationMessage, UnresolvedReason } from "./ChatbotAnswer";
export type ChatbotCaseSummary = {
  id: string;
  reference: string;
  state: "NEW" | "IN_PROGRESS" | "RESOLVED";
  assignedTo: string | null;
  assigneeName: string | null;
  reason: UnresolvedReason;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
};
export type ChatbotCase = ChatbotCaseSummary & {
  question: string;
  history: ConversationMessage[];
  releaseId: string | null;
  sourceIds: string[];
  resolutionNote: string | null;
  contact: { name: string; email: string; consent: true } | null;
};
