"use client";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { ChatbotCaseConversation } from "./ChatbotCaseConversation";
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
const stateLabels = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

function CaseDetailContent({
  id,
  onClose,
}: {
  id: string;
  onClose?: () => void;
}) {
  const query = useChatbotCase(id);
  const grants = useCapabilities();
  const { userId } = usePortalContext();
  const content = (
    <QuerySection
      query={query}
      loading={<Skeleton className="h-64" />}
      title="protected case history"
    >
      {(supportCase) => {
        const canResolve =
          grants.has(permissionCodes.chatbotEscalationResolveAll) ||
          (grants.has(permissionCodes.chatbotEscalationResolveAssigned) &&
            supportCase.assignedTo === userId);
        const canAssign = grants.has(
          permissionCodes.chatbotEscalationAssignAll,
        );
        return (
          <div className="space-y-6">
            <section
              className="rounded-xl border border-slate-200 p-4"
              aria-label="Case summary"
            >
              <Badge
                variant="outline"
                className="border-0 bg-blue-50 text-brand-navy"
              >
                {stateLabels[supportCase.state]}
              </Badge>
              <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Reason</dt>
                  <dd className="mt-1 capitalize text-brand-navy">
                    {supportCase.reason.replaceAll("_", " ").toLowerCase()}
                  </dd>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <dt className="text-slate-500">Assigned to</dt>
                  <dd className="mt-1 text-brand-navy">
                    {supportCase.assigneeName ?? "Unassigned"}
                  </dd>
                </div>
              </dl>
            </section>
            <ChatbotCaseConversation history={supportCase.history} />
            {supportCase.contact ? (
              <section
                className="rounded-xl border border-slate-200 p-4 text-sm"
                aria-label="Optional follow-up contact"
              >
                <h2 className="font-semibold">Consented contact</h2>
                <p>
                  {supportCase.contact.name} · {supportCase.contact.email}
                </p>
              </section>
            ) : null}
            {supportCase.resolutionNote ? (
              <p>Resolution: {supportCase.resolutionNote}</p>
            ) : null}
            {canResolve || canAssign ? (
              <section aria-label="Case management" className="space-y-4">
                <h3 className="text-xl font-bold text-brand-navy">
                  Case management
                </h3>
                {canResolve ? (
                  <ChatbotCaseStateForm
                    key={`state-${supportCase.rowVersion}`}
                    supportCase={supportCase}
                  />
                ) : null}
                {canAssign ? (
                  <ChatbotCaseAssignmentForm
                    key={`assignment-${supportCase.rowVersion}`}
                    supportCase={supportCase}
                  />
                ) : null}
              </section>
            ) : null}
          </div>
        );
      }}
    </QuerySection>
  );
  if (onClose) {
    return (
      <RightDrawer
        open
        onClose={onClose}
        size="xl"
        title={
          query.data ? `Case ${query.data.reference}` : "Chatbot support case"
        }
        description="Chatbot support case"
      >
        {content}
      </RightDrawer>
    );
  }
  return <PageShell title="Chatbot support case">{content}</PageShell>;
}
export function ChatbotCaseDetail({
  id,
  onClose,
}: {
  id: string;
  onClose?: () => void;
}) {
  return (
    <CapabilityGate any={chatbotCaseReadPermissions} mode="forbidden">
      <CaseDetailContent id={id} onClose={onClose} />
    </CapabilityGate>
  );
}
