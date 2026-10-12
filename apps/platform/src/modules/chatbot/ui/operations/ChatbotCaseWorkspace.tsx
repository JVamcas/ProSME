"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLink } from "@/shared/ui/Links";
import { useCapabilities } from "@/shared/ui/portal/capability-context";
import { ChatbotCaseDetail } from "./ChatbotCaseDetail";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { GeneralButton } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { CapabilityGate } from "@/shared/ui/portal/capability-gate";
import { chatbotCaseReadPermissions } from "./ChatbotCasePermissions";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ChatbotCaseScope } from "../../ClientChatbotCaseService";
import type { ChatbotCaseSummary } from "../../domain/ChatbotCase";
import { useChatbotCases } from "./useChatbotCases";
function caseColumns(
  openCase: (id: string) => void,
): DataTableColumn<ChatbotCaseSummary>[] {
  return [
    {
      id: "reference",
      header: "Case",
      cell: ({ row }) => (
        <ArrowLink
          href={`/admin/chatbot/cases/${row.original.id}`}
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            openCase(row.original.id);
          }}
        >
          {row.original.reference}
        </ArrowLink>
      ),
    },
    { accessorKey: "state", header: "State" },
    { accessorKey: "reason", header: "Reason" },
    {
      accessorKey: "assigneeName",
      header: "Assigned to",
      cell: ({ row }) => row.original.assigneeName ?? "Unassigned",
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
    },
  ];
}
function CaseQueueContent({
  scope,
  initialCaseId,
}: {
  scope: ChatbotCaseScope;
  initialCaseId?: string;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId);
  const router = useRouter();
  const columns = useMemo(
    () => caseColumns(setSelectedCaseId),
    [setSelectedCaseId],
  );
  function closeCase() {
    setSelectedCaseId(undefined);
    if (initialCaseId) {
      router.replace(
        scope === "all"
          ? "/admin/chatbot/cases"
          : "/admin/my-queue/escalated-cases",
      );
    }
  }
  const query = useChatbotCases(scope);
  const personal = scope === "assigned";
  return (
    <PageShell
      eyebrow={personal ? "My Queue" : "Process Monitor"}
      title={personal ? "Escalated cases" : "Escalated reviews"}
      description={
        personal
          ? "Chatbot cases assigned to you for follow-up."
          : "Track all escalated chatbot cases and their assigned staff."
      }
    >
      <QuerySection
        query={query}
        loading={<Skeleton className="h-48" />}
        title="support cases"
      >
        {(data) => (
          <DataTable
            columns={columns}
            data={data.pages.flatMap((page) => page.items)}
            rowKey={(row) => row.id}
            rowClassName={(row) =>
              row.id === selectedCaseId ? "bg-blue-50" : undefined
            }
            emptyMessage="No support cases in your authorized queue."
            footer={
              query.hasNextPage ? (
                <GeneralButton
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  Load more cases
                </GeneralButton>
              ) : undefined
            }
          />
        )}
      </QuerySection>
      {selectedCaseId ? (
        <ChatbotCaseDetail
          key={selectedCaseId}
          id={selectedCaseId}
          onClose={closeCase}
        />
      ) : null}
    </PageShell>
  );
}
export function ChatbotCaseWorkspace({
  scope,
  initialCaseId,
}: {
  scope?: ChatbotCaseScope;
  initialCaseId?: string;
}) {
  const grants = useCapabilities();
  const queueScope =
    scope ??
    (grants.has(permissionCodes.chatbotEscalationReadAll) ? "all" : "assigned");
  const permissions =
    queueScope === "all"
      ? [permissionCodes.chatbotEscalationReadAll]
      : chatbotCaseReadPermissions;
  return (
    <CapabilityGate any={permissions} mode="forbidden">
      <CaseQueueContent scope={queueScope} initialCaseId={initialCaseId} />
    </CapabilityGate>
  );
}
