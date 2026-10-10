"use client";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckboxField } from "@/shared/ui/FormField";
import { GeneralButton } from "@/shared/ui/Button";
import { permissionCodes } from "@/auth/authorization/permissions";
import { useCapabilities } from "@/shared/ui/portal/capability-context";
import {
  chatbotSettingsUpdateSchema,
  type ChatbotSettingsUpdate,
} from "../../api/ChatbotSettingsSchemas";
import type { ChatbotSettingsView } from "../../domain/ChatbotSettings";
import { useUpdateChatbotSettings } from "./useChatbotSettings";

export function ChatbotSettingsForm({
  settings,
}: {
  settings: ChatbotSettingsView;
}) {
  const grants = useCapabilities();
  const canEdit = grants.has(permissionCodes.chatbotSettingsUpdateAll);
  const mutation = useUpdateChatbotSettings();
  const form = useForm<ChatbotSettingsUpdate>({
    resolver: zodResolver(chatbotSettingsUpdateSchema),
    defaultValues: {
      publicEnabled: settings.publicEnabled,
      modelEnabled: settings.modelEnabled,
      expectedRowVersion: settings.rowVersion,
    },
  });
  const submit = form.handleSubmit((values) =>
    mutation.mutateAsync(values).catch(() => undefined),
  );
  return (
    <FormProvider {...form}>
      <form className="space-y-6" onSubmit={submit}>
        <CheckboxField
          name="publicEnabled"
          label="Enable chatbot"
          description="Allow visitors to start and continue chatbot conversations. Turning this off stops public conversations."
          disabled={!canEdit || mutation.isPending}
        />
        <CheckboxField
          name="modelEnabled"
          label="Enable AI answers"
          description="Use the configured AI provider to select answers from approved knowledge. Turning this off stops AI requests; unresolved questions can still be escalated while the chatbot is enabled."
          disabled={
            !canEdit ||
            mutation.isPending ||
            (!settings.providerReady && !settings.modelEnabled)
          }
        />
        {!settings.providerReady ? (
          <p role="status">AI answers require a configured AI provider.</p>
        ) : null}
        {canEdit ? (
          <GeneralButton type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </GeneralButton>
        ) : null}
      </form>
    </FormProvider>
  );
}
