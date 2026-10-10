import {
  getChatbotResources,
  updateChatbotResources,
} from "@/modules/chatbot/application/ServerChatbotResourceService";
import {
  chatbotBody,
  chatbotRoute,
} from "@/modules/chatbot/api/ChatbotRouteTransport";

export async function GET(request: Request) {
  return chatbotRoute(request, (user) =>
    getChatbotResources(
      user,
      Object.fromEntries(new URL(request.url).searchParams),
    ),
  );
}

export async function PATCH(request: Request) {
  return chatbotRoute(request, async (user) =>
    updateChatbotResources(user, await chatbotBody(request)),
  );
}
