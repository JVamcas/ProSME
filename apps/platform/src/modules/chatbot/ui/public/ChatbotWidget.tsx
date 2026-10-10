"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { chatbotNoticeVersion } from "../../domain/ChatbotAnswer";
import type { ChatbotNotice } from "../../domain/ChatbotConversation";
import { ChatbotContactForm } from "./ChatbotContactForm";
import { ChatbotLauncher } from "./ChatbotLauncher";
import { ChatbotMenu } from "./ChatbotMenu";
import { ChatbotQuestionForm } from "./ChatbotQuestionForm";
import { ChatbotTranscript } from "./ChatbotTranscript";
import { useChatbotNotice, useVisitorChatbot } from "./useVisitorChatbot";

export function ChatbotWidget() {
  const notice = useChatbotNotice();
  if (!notice.data?.enabled) return null;
  return (
    <EnabledChatbotWidget notice={notice.data} unavailable={notice.isError} />
  );
}

function EnabledChatbotWidget({
  notice,
  unavailable,
}: {
  notice: ChatbotNotice;
  unavailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [conversationKey, setConversationKey] = useState(0);
  const chat = useVisitorChatbot(notice);
  const busy =
    chat.start.isPending || chat.question.isPending || chat.contact.isPending;
  const latest = chat.turns.at(-1);
  const caseId = chat.turns.findLast((turn) => turn.caseId)?.caseId;
  const choices = latest?.answer.callChoices ?? [];
  const error = chat.contact.error ?? chat.question.error ?? chat.start.error;
  const noticeChanged = notice.noticeVersion !== chatbotNoticeVersion;
  const close = () => setOpen(false);
  const reset = () => {
    chat.reset();
    setConversationKey((value) => value + 1);
  };

  return (
    <>
      <ChatbotLauncher open={open} onOpen={() => setOpen(true)} />
      <RightDrawer
        open={open}
        onClose={close}
        title="Programme assistant"
        description="Ask us about funding"
        presentation="floating"
        size="md"
        titleIcon={
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-orange text-white">
            <MessageCircle aria-hidden="true" className="size-5" />
          </span>
        }
        headerActions={
          <ChatbotMenu busy={busy} onNavigate={close} onReset={reset} />
        }
        footer={
          <div data-heatmap-mask>
            <ChatbotQuestionForm
              key={conversationKey}
              busy={busy}
              disabled={unavailable || noticeChanged || chat.turns.length >= 30}
              choices={choices}
              notice={notice}
              onQuestion={chat.question.mutateAsync}
            />
          </div>
        }
      >
        <div data-heatmap-mask className="space-y-5 text-brand-navy">
          {unavailable ? (
            <p role="alert" className="text-sm">
              The assistant is temporarily unavailable. Please contact the
              programme team.
            </p>
          ) : null}
          {noticeChanged ? (
            <p role="alert" className="text-sm">
              The notice has changed. Refresh this page before sending.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm">
              Please try again or contact the programme team.
            </p>
          ) : null}
          {chat.expired ? (
            <p role="status" className="text-xs text-brand-navy/65">
              Your session has expired. Send a message to start again.
            </p>
          ) : null}
          <ChatbotTranscript
            turns={chat.turns}
            busy={busy || unavailable || noticeChanged}
            onQuestion={(question) => {
              void chat.question
                .mutateAsync({ question })
                .catch(() => undefined);
            }}
            pendingQuestion={
              chat.question.isPending
                ? chat.question.variables?.question
                : undefined
            }
            onNavigate={close}
          />
          {chat.turns.length >= 30 ? (
            <p role="status" className="text-sm">
              You have reached this conversation’s limit. Start a new
              conversation from the options menu to continue.
            </p>
          ) : null}
          {caseId && chat.session ? (
            <details
              key={caseId}
              className="rounded-xl border border-brand-navy/10 bg-white p-3 text-sm"
            >
              <summary tabIndex={0} className="cursor-pointer font-semibold">
                Request staff follow-up
              </summary>
              <div className="pt-4">
                <ChatbotContactForm
                  busy={busy || unavailable}
                  saved={chat.contact.isSuccess}
                  onSave={chat.contact.mutateAsync}
                />
              </div>
            </details>
          ) : null}
        </div>
      </RightDrawer>
    </>
  );
}
