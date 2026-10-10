import { AuthenticationRequiredError } from "@/auth/authorization/policy";
import { isAuthorizedServiceProcessorRequest } from "@/platform/jobs/ServiceProcessorAuthorization";
import { chatbotPublicRoute } from "./ChatbotPublicTransport";

export function chatbotProcessorRoute<T>(
  request: Request,
  operation: () => Promise<T>,
) {
  return chatbotPublicRoute(async () => {
    if (
      !isAuthorizedServiceProcessorRequest(
        request.headers.get("authorization"),
        process.env.CHATBOT_PROCESSOR_SECRET ?? "",
      )
    )
      throw new AuthenticationRequiredError();
    return operation();
  });
}
