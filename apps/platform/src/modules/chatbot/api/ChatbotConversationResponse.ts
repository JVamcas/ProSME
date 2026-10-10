import type {
  ChatbotTurnResponse,
  PublicChatbotTurnResponse,
} from "../domain/ChatbotConversation";

export function publicChatbotTurnResponse(
  response: ChatbotTurnResponse,
): PublicChatbotTurnResponse {
  return {
    answer: response.answer,
    caseId: response.caseId,
    caseReference: response.caseReference,
  };
}
