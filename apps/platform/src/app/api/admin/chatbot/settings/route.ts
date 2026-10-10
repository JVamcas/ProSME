import {
  getChatbotSettings,
  updateChatbotSettings,
} from "@/modules/chatbot/application/ServerChatbotSettingsService";
import {
  chatbotBody,
  chatbotRoute,
} from "@/modules/chatbot/api/ChatbotRouteTransport";

export async function GET(request: Request) {
  return chatbotRoute(request, getChatbotSettings);
}

export async function PATCH(request: Request) {
  return chatbotRoute(request, async (user) =>
    updateChatbotSettings(user, await chatbotBody(request)),
  );
}
