import { createCorrelationId } from "@/lib/api/PortalApiResponse";
import { chatbotSafeRouteError } from "@/modules/chatbot/api/ChatbotRouteTransport";
import { getPublicChatbotDocument } from "@/modules/chatbot/application/ServerChatbotDocumentService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await context.params;
    const document = await getPublicChatbotDocument(documentId);
    return new Response(`${document.name}\n\n${document.text}`, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return chatbotSafeRouteError(error, createCorrelationId());
  }
}
