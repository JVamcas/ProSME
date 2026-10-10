import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  createCorrelationId,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { ChatbotRateLimitError } from "../application/ServerChatbotConversationService";
import { chatbotSafeRouteError } from "./ChatbotRouteTransport";

export async function chatbotPublicRoute<T>(operation: () => Promise<T>) {
  const correlation = createCorrelationId();
  try {
    return portalRouteSuccess(await operation(), correlation);
  } catch (error) {
    if (error instanceof ChatbotRateLimitError)
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: error.message } },
        {
          status: 429,
          headers: { "Cache-Control": "no-store", "Retry-After": "60" },
        },
      );
    return chatbotSafeRouteError(error, correlation);
  }
}

export function chatbotNetworkIdentity(request: Request) {
  // The proxy header is accepted only when the operator explicitly trusts a
  // proxy that overwrites it. Without that configuration sessions share a cap.
  if (process.env.CHATBOT_TRUST_PROXY_IP !== "true")
    return "shared-public-network";
  const secret = process.env.CHATBOT_NETWORK_HASH_SECRET;
  if (!secret || secret.length < 32)
    throw new RequestValidationError(
      "Network rate limiting must be configured before public chat starts.",
    );
  const address = (request.headers.get("x-real-ip") ?? "unknown").slice(0, 100);
  return createHmac("sha256", secret).update(address).digest("hex");
}
