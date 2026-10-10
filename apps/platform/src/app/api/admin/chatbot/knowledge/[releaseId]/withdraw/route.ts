import { retiredChatbotKnowledgeWorkflow } from "@/modules/chatbot/application/ServerChatbotResourceService";
import { chatbotRoute } from "@/modules/chatbot/api/ChatbotRouteTransport";

export async function POST(request: Request) {
  return chatbotRoute(request, retiredChatbotKnowledgeWorkflow);
}
