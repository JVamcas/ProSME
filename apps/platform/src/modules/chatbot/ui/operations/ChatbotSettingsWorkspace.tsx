"use client";
import { permissionCodes } from "@/auth/authorization/permissions";
import { CapabilityGate } from "@/shared/ui/portal/capability-gate";
import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { ChatbotSettingsForm } from "./ChatbotSettingsForm";
import { useChatbotSettings } from "./useChatbotSettings";

function SettingsContent() {
  const query = useChatbotSettings();
  return (
    <PageShell
      title="Chatbot settings"
      description="Control chatbot availability and AI answers for the application."
    >
      <QuerySection
        query={query}
        loading={<Skeleton className="h-48" />}
        title="chatbot settings"
      >
        {(settings) => (
          <ChatbotSettingsForm key={settings.rowVersion} settings={settings} />
        )}
      </QuerySection>
    </PageShell>
  );
}

export function ChatbotSettingsWorkspace() {
  return (
    <CapabilityGate
      capability={permissionCodes.chatbotSettingsReadAll}
      mode="forbidden"
    >
      <SettingsContent />
    </CapabilityGate>
  );
}
