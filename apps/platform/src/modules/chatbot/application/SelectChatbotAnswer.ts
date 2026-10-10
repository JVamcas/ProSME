import { z } from "zod";
import type {
  ChatbotAnswer,
  ChatbotPassageSelector,
  ConversationMessage,
  UnresolvedReason,
} from "../domain/ChatbotAnswer";
import type { KnowledgeRecord } from "../domain/ChatbotKnowledge";
import { chatbotLimits } from "../domain/ChatbotLimits";
import { retrieveChatbotPassages } from "../engine/ChatbotRetrieval";
import { screenChatbotText } from "../engine/ChatbotScreening";

export function unresolvedChatbotAnswer(
  reason: UnresolvedReason,
  releaseId: string | null = null,
): ChatbotAnswer {
  return {
    status: "UNRESOLVED",
    reason,
    text:
      reason === "SERVICE_FAILURE"
        ? "Programme guidance is temporarily unavailable."
        : reason === "AMBIGUOUS_CALL"
          ? "Which funding call is your question about?"
          : "I cannot confirm an answer from the approved public guidance. Support staff can review this question.",
    passages: [],
    sourceIds: [],
    releaseId,
    callChoices: [],
  };
}

const selectionSchema = z
  .object({
    status: z.enum(["ANSWER", "INSUFFICIENT", "CONFLICTING"]),
    passageIds: z.array(z.string().min(1).max(200)).max(3),
  })
  .strict();

export async function selectChatbotAnswer(input: {
  question: string;
  context: ConversationMessage[];
  callId: string | null;
  releaseId: string;
  records: KnowledgeRecord[];
  selector: ChatbotPassageSelector;
}): Promise<ChatbotAnswer> {
  const screened = screenChatbotText(input.question);
  if (screened.blocked)
    return unresolvedChatbotAnswer("SCREENED_QUERY", input.releaseId);
  const search = retrieveChatbotPassages(
    input.records,
    screened.text,
    input.callId,
  );
  if (search.ambiguous)
    return {
      ...unresolvedChatbotAnswer("AMBIGUOUS_CALL", input.releaseId),
      callChoices: search.callChoices,
    };
  if (!search.candidates.length)
    return unresolvedChatbotAnswer("MISSING_EVIDENCE", input.releaseId);
  const context = input.context
    .filter((message) => message.role === "visitor")
    .slice(-4)
    .map((message) => screenChatbotText(message.text))
    .filter((message) => !message.blocked)
    .map((message) => message.text);
  const selectedCall = input.records.find(
    (record) =>
      record.kind === "funding-call" &&
      record.scope?.fundingCallId === input.callId,
  );
  const result = selectionSchema.safeParse(
    await input.selector.select({
      question: screened.text,
      callContext: input.callId ? (selectedCall?.title ?? null) : null,
      context,
      candidates: search.candidates.map((record) => ({
        id: record.id,
        title: record.title,
        text: record.text,
      })),
    }),
  );
  if (
    !result.success ||
    new Set(result.data.passageIds).size !== result.data.passageIds.length
  )
    return unresolvedChatbotAnswer("SERVICE_FAILURE", input.releaseId);
  const selection = result.data;
  if (
    selection.passageIds.some(
      (id) => !search.candidates.some((record) => record.id === id),
    )
  )
    return unresolvedChatbotAnswer("SERVICE_FAILURE", input.releaseId);
  if (selection.status !== "ANSWER")
    return unresolvedChatbotAnswer(
      selection.status === "CONFLICTING"
        ? "CONFLICTING_EVIDENCE"
        : "INSUFFICIENT_EVIDENCE",
      input.releaseId,
    );
  if (!selection.passageIds.length)
    return unresolvedChatbotAnswer("INSUFFICIENT_EVIDENCE", input.releaseId);
  const records = selection.passageIds.map((id) =>
    search.candidates.find((record) => record.id === id)!,
  );
  const passages = records.map((record) => ({
    id: record.id,
    text: record.text,
    title: record.title,
    url: record.source.url,
  }));
  if (
    passages.reduce((sum, passage) => sum + passage.text.length, 0) >
    chatbotLimits.answerCharacters
  )
    return unresolvedChatbotAnswer("INSUFFICIENT_EVIDENCE", input.releaseId);
  return {
    status: "ANSWERED",
    reason: null,
    text: passages.map((passage) => passage.text).join("\n\n"),
    passages,
    sourceIds: [
      ...new Set(
        records.map(
          (record) =>
            `${record.source.kind}:${record.source.id}:${record.source.revision}`,
        ),
      ),
    ],
    releaseId: input.releaseId,
    callChoices: [],
  };
}
