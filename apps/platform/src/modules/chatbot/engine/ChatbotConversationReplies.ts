import {
  chatbotWelcomeMessage,
  type ChatbotAnswer,
} from "../domain/ChatbotAnswer";

export function chatbotGreetingAnswer(question: string): ChatbotAnswer | null {
  const greeting = question
    .trim()
    .toLowerCase()
    .replace(/[.!?,]+$/u, "")
    .trim();
  const isGreeting =
    /^(hi|hello|hey|hiya|greetings|good morning|good afternoon|good evening)$/u.test(
      greeting,
    );
  if (!isGreeting) {
    return null;
  }

  return {
    status: "ANSWERED",
    reason: null,
    text: chatbotWelcomeMessage,
    passages: [],
    releaseId: null,
    sourceIds: [],
    callChoices: [],
  };
}
