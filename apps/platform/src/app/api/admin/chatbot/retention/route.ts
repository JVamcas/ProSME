import {
  getChatbotRetentionPolicy,
  updateChatbotRetentionPolicy,
} from "@/modules/chatbot/application/ServerChatbotPolicyService";
import {
  chatbotRoute,
  chatbotBody,
} from "@/modules/chatbot/api/ChatbotRouteTransport";
export async function GET(request: Request) {
  return chatbotRoute(request, getChatbotRetentionPolicy);
}
export async function PUT(request: Request) {
  return chatbotRoute(request, async (user) =>
    updateChatbotRetentionPolicy(user, await chatbotBody(request)),
  );
}
