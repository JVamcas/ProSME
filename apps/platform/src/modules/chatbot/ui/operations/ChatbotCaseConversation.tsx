import { Info } from "lucide-react";

import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { ConversationMessage } from "../../domain/ChatbotAnswer";
import { ChatbotMessageBubble } from "../ChatbotMessageBubble";

export function ChatbotCaseConversation({
  history,
}: {
  history: ConversationMessage[];
}) {
  return (
    <section aria-labelledby="case-conversation-heading">
      <h3
        id="case-conversation-heading"
        className="text-xl font-bold text-brand-navy"
      >
        Conversation
      </h3>
      <div className="mt-3 space-y-5 rounded-xl border border-slate-200 p-4">
        {history.map((message, index) => {
          const visitor = message.role === "visitor";
          const label = visitor ? "Visitor" : "Programme guidance";

          return (
            <article key={`${message.at}-${index}`} className="min-w-0">
              <p
                className={`mb-2 text-xs text-slate-500 ${visitor ? "text-right" : ""}`}
              >
                {label} ·{" "}
                <time dateTime={message.at}>
                  {formatLocalDateTime24(message.at)}
                </time>
              </p>
              <ChatbotMessageBubble
                sender={message.role}
                senderLabel={label}
                appearance="support"
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </ChatbotMessageBubble>
            </article>
          );
        })}
        <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-brand-navy">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Screened history is restricted to authorized staff and is never added
          to chatbot knowledge.
        </p>
      </div>
    </section>
  );
}
