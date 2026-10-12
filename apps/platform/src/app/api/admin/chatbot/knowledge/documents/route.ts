import { chatbotRoute } from "@/modules/chatbot/api/ChatbotRouteTransport";
import { chatbotDocumentBody } from "@/modules/chatbot/api/ChatbotDocumentTransport";
import {
  requireChatbotDocumentUpload,
  uploadChatbotDocument,
} from "@/modules/chatbot/application/ServerChatbotDocumentService";

export async function POST(request: Request) {
  return chatbotRoute(request, async (user) => {
    requireChatbotDocumentUpload(user);
    return uploadChatbotDocument(user, await chatbotDocumentBody(request));
  });
}
