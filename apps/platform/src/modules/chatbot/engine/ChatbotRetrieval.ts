import type { KnowledgeRecord } from "../domain/ChatbotKnowledge";
import { chatbotLimits } from "../domain/ChatbotLimits";
import { containsChatbotInstructions } from "./ChatbotScreening";

const stopWords = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "can",
  "i",
  "my",
  "how",
  "what",
  "for",
  "of",
  "to",
  "do",
  "does",
  "and",
  "in",
  "it",
  "with",
  "please",
  "me",
]);
function tokens(text: string) {
  return [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter(
    (word) => word.length > 1 && !stopWords.has(word),
  );
}

export function retrieveChatbotPassages(
  records: KnowledgeRecord[],
  question: string,
  callId: string | null,
) {
  if (records.length > chatbotLimits.preparedRecords)
    throw new Error("Knowledge search limit exceeded.");
  const query = tokens(question);
  const callChoices = records
    .filter((record) => record.kind === "funding-call")
    .map((record) => ({
      id: record.scope!.fundingCallId,
      title: record.title,
    }));
  if (callId && !callChoices.some((call) => call.id === callId))
    return { candidates: [], callChoices, ambiguous: true };
  const ranked = records
    .filter(
      (record) =>
        (!callId || !record.scope || record.scope.fundingCallId === callId) &&
        !containsChatbotInstructions(`${record.title}\n${record.text}`),
    )
    .map((record) => {
      const title = new Set(tokens(record.title));
      const text = new Set(tokens(record.text));
      const score = query.reduce(
        (sum, word) => sum + (title.has(word) ? 4 : text.has(word) ? 1 : 0),
        0,
      );
      return { record, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.record.id.localeCompare(right.record.id),
    );
  const namedCalls = callChoices.filter((call) =>
    query.some((word) => tokens(call.title).includes(word)),
  );
  const matchedScopes = new Set(
    ranked
      .filter((item) => item.record.scope)
      .map((item) => item.record.scope!.fundingCallId),
  );
  const globalBest = ranked[0]?.record.scope === null;
  const ambiguous =
    !callId && !globalBest && namedCalls.length !== 1 && matchedScopes.size > 1;
  const inferredCall =
    callId ?? (namedCalls.length === 1 ? namedCalls[0].id : null);
  let characters = 0;
  const candidates = ranked
    .filter(
      (item) =>
        !inferredCall ||
        !item.record.scope ||
        item.record.scope.fundingCallId === inferredCall,
    )
    .filter((item) => {
      characters += item.record.text.length + item.record.title.length;
      return characters <= chatbotLimits.modelInputCharacters;
    })
    .slice(0, chatbotLimits.searchCandidates)
    .map((item) => item.record);
  return {
    candidates: ambiguous ? [] : candidates,
    callChoices: ambiguous ? callChoices : [],
    ambiguous,
  };
}
