import "server-only";
import { chatbotPolicySchema } from "../api/ChatbotKnowledgeSchemas";

// Optional JSON configuration; staff recipient identities can remain empty while
// developing CB0-CB2. Delivery authorization/activation belongs to CB5-CB6.
export function readChatbotOperationalPolicy(
  value = process.env.CHATBOT_POLICY_JSON,
) {
  return chatbotPolicySchema.parse(value ? JSON.parse(value) : {});
}
