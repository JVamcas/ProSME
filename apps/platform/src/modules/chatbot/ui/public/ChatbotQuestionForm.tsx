"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";
import { IconButton } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { Select, Textarea } from "@/shared/ui/FormPrimitives";
import { chatbotTurnSchema } from "../../api/ChatbotConversationSchemas";
import { chatbotLimits } from "../../domain/ChatbotLimits";
import type { ChatbotAnswer } from "../../domain/ChatbotAnswer";
import type {
  ChatbotNotice,
  PublicChatbotTurnResponse,
} from "../../domain/ChatbotConversation";
import { ChatbotPrivacyNotice } from "./ChatbotPrivacyNotice";

const questionSchema = chatbotTurnSchema.omit({ turnId: true });

export function ChatbotQuestionForm({
  busy,
  disabled,
  choices,
  notice,
  onQuestion,
}: {
  busy: boolean;
  disabled: boolean;
  choices: ChatbotAnswer["callChoices"];
  notice: ChatbotNotice;
  onQuestion: (
    values: z.infer<typeof questionSchema>,
  ) => Promise<PublicChatbotTurnResponse>;
}) {
  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: { question: "", fundingCallId: null },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      const response = await onQuestion(values);
      if (response.answer.reason !== "AMBIGUOUS_CALL") {
        form.reset({ question: "", fundingCallId: values.fundingCallId });
      }
    } catch {
      // Keep the exact question available for an idempotent retry.
    }
  });

  return (
    <FormProvider {...form}>
      <form className="space-y-2" onSubmit={submit}>
        {choices.length ? (
          <FormField label="Which funding call?" htmlFor="chatbot-call">
            <Select
              id="chatbot-call"
              disabled={busy || disabled}
              {...form.register("fundingCallId", {
                setValueAs: (value: string) => value || null,
              })}
            >
              <option value="">Choose a funding call</option>
              {choices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.title}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
        <div className="relative">
          <FormField
            className="min-w-0 flex-1"
            label="Your programme question"
            labelClassName="sr-only"
            htmlFor="chatbot-question"
            errorId="chatbot-question-error"
            error={form.formState.errors.question?.message}
          >
            <Textarea
              id="chatbot-question"
              {...form.register("question")}
              placeholder="Type a message…"
              rows={1}
              className="max-h-32 min-h-12 resize-none rounded-3xl pr-14"
              maxLength={chatbotLimits.questionCharacters}
              disabled={busy || disabled}
              aria-invalid={Boolean(form.formState.errors.question)}
              aria-describedby="chatbot-privacy-summary chatbot-question-error"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  if (!busy && !disabled) void submit();
                }
              }}
            />
          </FormField>
          <IconButton
            label="Send question"
            type="submit"
            variant="ghost"
            className="absolute top-1 right-1"
            disabled={busy || disabled}
          >
            <Send aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
        <ChatbotPrivacyNotice notice={notice} />
      </form>
    </FormProvider>
  );
}
