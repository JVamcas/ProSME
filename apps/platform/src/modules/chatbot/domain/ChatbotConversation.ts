import type { ChatbotAnswer } from "./ChatbotAnswer";

export type ChatbotNotice = {
  enabled: boolean;
  notice: string;
  noticeVersion: string;
  sessionMinutes: number;
  escalationDays: number;
  contactDays: number;
};

export type ChatbotSession = Omit<ChatbotNotice, "enabled"> & {
  id: string;
  credential: string;
};

export type ChatbotTurnResponse = {
  answer: ChatbotAnswer;
  caseId: string | null;
  caseReference: string | null;
  notificationQueued: boolean;
};

export type PublicChatbotTurnResponse = Omit<
  ChatbotTurnResponse,
  "notificationQueued"
>;

export type VisitorChatbotTurn = PublicChatbotTurnResponse & {
  id: string;
  question: string;
};
