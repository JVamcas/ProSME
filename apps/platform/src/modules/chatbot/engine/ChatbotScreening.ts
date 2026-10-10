import { chatbotLimits } from "../domain/ChatbotLimits";

const instructionPattern =
  /(?:ignore|override|disregard)\s+(?:all\s+)?(?:previous|system|developer|prior)\s+(?:instructions|prompts)|(?:system|developer)\s*(?:prompt|message)\s*:|<\/?(?:system|tool|script)>|(?:reveal|print|show)\s+(?:credentials|secrets|system prompt)|(?:execute|run)\s+(?:sql|javascript|shell)|BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY/i;

export function containsChatbotInstructions(text: string) {
  return instructionPattern.test(text);
}

export function screenChatbotText(text: string) {
  const normalized = text
    .normalize("NFKC")
    .replace(
      /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g,
      " ",
    )
    .trim();
  const blocked = containsChatbotInstructions(normalized);
  const screened = normalized
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[contact removed]")
    .replace(
      /\b(?:Bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/gi,
      "[credential removed]",
    )
    .replace(/(?:\+\d[\d ()-]{7,}\d|\b\d[\d -]{8,}\d\b)/g, "[number removed]")
    .slice(0, chatbotLimits.questionCharacters);
  return {
    text: blocked ? "[Instruction-like content removed]" : screened,
    blocked,
  };
}
