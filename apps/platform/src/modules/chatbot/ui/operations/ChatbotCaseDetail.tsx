"use client";
import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Badge } from "@/shared/ui/Badge";
import { CapabilityGate } from "@/shared/ui/portal/capability-gate";
import {
  useCapabilities,
  usePortalContext,
} from "@/shared/ui/portal/capability-context";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  ChatbotCaseAssignmentForm,
  ChatbotCaseStateForm,
} from "./ChatbotCaseForms";
import { chatbotCaseReadPermissions } from "./ChatbotCasePermissions";
import { useChatbotCase } from "./useChatbotCases";
function CaseDetailContent({ id }: { id: string }) {
  const query = useChatbotCase(id);
  const grants = useCapabilities();
  const { userId } = usePortalContext();
  return (
    <PageShell
      title="Chatbot support case"
      description="Screened history is restricted to authorized staff and is never added to chatbot knowledge."
    >
      <QuerySection
        query={query}
        loading={<Skeleton className="h-64" />}
        title="protected case history"
      >
        {(supportCase) => (
          <div className="space-y-6">
            <p>Support ticket: {supportCase.reference}</p>
            <Badge>{supportCase.state}</Badge>
            <p>
              Reason: {supportCase.reason.replaceAll("_", " ").toLowerCase()}
            </p>
            <p>Assigned to: {supportCase.assigneeName ?? "Unassigned"}</p>
            <section
              aria-label="Protected conversation history"
              className="space-y-4"
            >
              {supportCase.history.map((message, index) => (
                <article key={index}>
                  <h2 className="font-semibold">
                    {message.role === "visitor"
                      ? "Visitor"
                      : "Programme guidance"}{" "}
                    · {new Date(message.at).toLocaleString()}
                  </h2>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </article>
              ))}
            </section>
            {supportCase.contact ? (
              <section aria-label="Optional follow-up contact">
                <h2 className="font-semibold">Consented contact</h2>
                <p>
                  {supportCase.contact.name} · {supportCase.contact.email}
                </p>
              </section>
            ) : null}
            {supportCase.resolutionNote ? (
              <p>Resolution: {supportCase.resolutionNote}</p>
            ) : null}
            {grants.has(permissionCodes.chatbotEscalationResolveAll) ||
            (grants.has(permissionCodes.chatbotEscalationResolveAssigned) &&
              supportCase.assignedTo === userId) ? (
              <ChatbotCaseStateForm
                key={`state-${supportCase.rowVersion}`}
                supportCase={supportCase}
              />
            ) : null}
            {grants.has(permissionCodes.chatbotEscalationAssignAll) ? (
              <ChatbotCaseAssignmentForm
                key={`assignment-${supportCase.rowVersion}`}
                supportCase={supportCase}
              />
            ) : null}
          </div>
        )}
      </QuerySection>
    </PageShell>
  );
}
export function ChatbotCaseDetail({ id }: { id: string }) {
  return (
    <CapabilityGate any={chatbotCaseReadPermissions} mode="forbidden">
      <CaseDetailContent id={id} />
    </CapabilityGate>
  );
}
