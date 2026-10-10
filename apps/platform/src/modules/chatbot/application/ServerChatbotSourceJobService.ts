import "server-only";
import {
  synchronizeChatbotResources,
  type ChatbotStorageFactory,
} from "./SynchronizeChatbotResources";

// Application publication is the approval. Refresh active public resources automatically.
export async function reconcileChatbotSources(adapter?: ChatbotStorageFactory) {
  return synchronizeChatbotResources(adapter);
}
