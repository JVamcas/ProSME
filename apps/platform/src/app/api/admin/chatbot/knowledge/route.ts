import { getChatbotKnowledgeWorkspace } from "@/modules/chatbot/application/ServerChatbotKnowledgeService";
import { retiredChatbotKnowledgeWorkflow } from "@/modules/chatbot/application/ServerChatbotResourceService";
import { chatbotRoute } from "@/modules/chatbot/api/ChatbotRouteTransport";

export async function GET(request: Request) {
  return chatbotRoute(request, getChatbotKnowledgeWorkspace);
}

export async function POST(request: Request) {
  return chatbotRoute(request, retiredChatbotKnowledgeWorkflow);
}
