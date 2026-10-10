"use client";
import Link from "next/link";
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
const columns: DataTableColumn<ChatbotCaseSummary>[] = [
  {
    id: "reference",
    header: "Case",
    cell: ({ row }) => (
      <Link href={`/admin/chatbot/cases/${row.original.id}`}>
        {row.original.reference}
      </Link>
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
function CaseQueueContent({ scope }: { scope: ChatbotCaseScope }) {
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
    </PageShell>
  );
}
export function ChatbotCaseWorkspace({
  scope = "all",
}: {
  scope?: ChatbotCaseScope;
}) {
  const permissions =
    scope === "all"
      ? [permissionCodes.chatbotEscalationReadAll]
      : chatbotCaseReadPermissions;
  return (
    <CapabilityGate any={permissions} mode="forbidden">
      <CaseQueueContent scope={scope} />
    </CapabilityGate>
  );
}
