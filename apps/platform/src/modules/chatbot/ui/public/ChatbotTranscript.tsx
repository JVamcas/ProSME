"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { GeneralButton } from "@/shared/ui/Button";
import { ArrowLink } from "@/shared/ui/Links";
import { chatbotWelcomeMessage } from "../../domain/ChatbotAnswer";
import type { VisitorChatbotTurn } from "../../domain/ChatbotConversation";
import { ChatbotMessageBubble } from "./ChatbotMessageBubble";

const suggestedQuestions = [
  "What funding is available?",
  "Who can apply for funding?",
  "How do I apply?",
];

export function ChatbotTranscript({
  turns,
  pendingQuestion,
  busy,
  onQuestion,
  onNavigate,
}: {
  turns: VisitorChatbotTurn[];
  pendingQuestion?: string;
  busy: boolean;
  onQuestion: (question: string) => void;
  onNavigate: () => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (turns.length || pendingQuestion) {
      end.current?.scrollIntoView?.({ block: "nearest" });
    }
  }, [turns.length, pendingQuestion]);

  return (
    <div
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      aria-relevant="additions"
      className="space-y-5 px-1"
    >
      <ChatbotMessageBubble sender="assistant" showAvatar>
        <p>{chatbotWelcomeMessage}</p>
        {!turns.length && !pendingQuestion ? (
          <div className="pt-2">
            {suggestedQuestions.map((question) => (
              <GeneralButton
                key={question}
                variant="ghost"
                className="h-auto min-h-12 w-full justify-between rounded-lg px-0 py-3 text-left text-sm font-normal whitespace-normal"
                disabled={busy}
                onClick={() => onQuestion(question)}
              >
                {question}
                <ChevronRight aria-hidden="true" className="size-4" />
              </GeneralButton>
            ))}
          </div>
        ) : null}
      </ChatbotMessageBubble>
      {turns.map((turn) => (
        <article key={turn.id} className="space-y-5 break-words">
          <ChatbotMessageBubble sender="visitor">
            <p className="whitespace-pre-wrap text-sm leading-6">
              {turn.question}
            </p>
          </ChatbotMessageBubble>
          <ChatbotMessageBubble sender="assistant">
            <p className="whitespace-pre-wrap text-sm leading-6">
              {turn.answer.text}
            </p>
            {turn.answer.passages.length ? (
              <ul aria-label="Answer sources" className="space-y-2 text-xs">
                {turn.answer.passages.map((passage) => (
                  <li key={passage.id}>
                    <ArrowLink
                      className="max-w-full whitespace-normal"
                      href={passage.url}
                      onClick={onNavigate}
                    >
                      {passage.title}
                    </ArrowLink>
                  </li>
                ))}
              </ul>
            ) : null}
            {turn.caseId ? (
              <details className="text-xs leading-5 text-brand-navy/65">
                <summary tabIndex={0} className="cursor-pointer">
                  Support details
                </summary>
                <div className="mt-2 space-y-2">
                  <p>
                    {turn.caseReference ? (
                      <>
                        Support ticket:{" "}
                        <span className="font-semibold">
                          {turn.caseReference}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p>Your question was saved for staff follow-up.</p>
                </div>
              </details>
            ) : null}
          </ChatbotMessageBubble>
        </article>
      ))}
      {pendingQuestion ? (
        <div className="space-y-5 text-sm leading-6">
          <ChatbotMessageBubble sender="visitor">
            <p className="whitespace-pre-wrap">{pendingQuestion}</p>
          </ChatbotMessageBubble>
          <ChatbotMessageBubble sender="assistant">
            <p
              role="status"
              className="text-brand-navy/65 motion-safe:animate-pulse"
            >
              Finding an answer…
            </p>
          </ChatbotMessageBubble>
        </div>
      ) : null}
      <div ref={end} />
    </div>
  );
}
