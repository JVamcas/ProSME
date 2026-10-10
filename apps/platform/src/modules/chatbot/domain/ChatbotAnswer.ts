export type UnresolvedReason =
  | "MISSING_EVIDENCE"
  | "INSUFFICIENT_EVIDENCE"
  | "CONFLICTING_EVIDENCE"
  | "AMBIGUOUS_CALL"
  | "SCREENED_QUERY"
  | "SERVICE_FAILURE";
export type ChatbotAnswer = {
  status: "ANSWERED" | "UNRESOLVED";
  reason: UnresolvedReason | null;
  text: string;
  passages: { id: string; text: string; title: string; url: string }[];
  releaseId: string | null;
  sourceIds: string[];
  callChoices: { id: string; title: string }[];
};
export type PassageSelectionRequest = {
  question: string;
  callContext?: string | null;
  context: string[];
  candidates: { id: string; title: string; text: string }[];
};
export interface ChatbotPassageSelector {
  select(input: PassageSelectionRequest): Promise<unknown>;
}
export type ConversationMessage = {
  role: "visitor" | "assistant";
  text: string;
  at: string;
};

export const chatbotPrivacyNotice =
  "Ask about public funding programmes only. Avoid personal or application details. We retain screened conversation history when we cannot answer and share it with authorized support staff. Model-assisted selection uses screened questions and approved public passages. Session context expires after the configured session period; support cases and optional contact details follow the configured retention period.";
export const chatbotNoticeVersion = "2026-10-10-v1";

export const chatbotWelcomeMessage =
  "Hello! I can help with funding programmes, application requirements and how to apply. What would you like to know?";
