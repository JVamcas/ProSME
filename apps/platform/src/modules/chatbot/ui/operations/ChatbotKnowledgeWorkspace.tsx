"use client";
import { permissionCodes } from "@/auth/authorization/permissions";
import { CapabilityGate } from "@/shared/ui/portal/capability-gate";
import { useState } from "react";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/shared/ui/Pagination";
import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { ChatbotResourceTable } from "./ChatbotResourceTable";
import { useChatbotResources } from "./useChatbotResources";

function ResourceWorkspace() {
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const query = useChatbotResources(pagination);
  return (
    <PageShell
      title="Chatbot knowledge base"
      description="Choose which published resources the chatbot can use. Active resources update automatically when their published content changes."
    >
      <QuerySection
        query={query}
        loading={<Skeleton className="h-48" />}
        title="chatbot resources"
      >
        {(data) => (
          <ChatbotResourceTable
            key={`${data.page}:${data.pageSize}`}
            items={data.items}
            footer={
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                disabled={query.isFetching}
                hasNextPage={data.page * data.pageSize < data.total}
                onNext={() =>
                  setPagination((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
                onPrevious={() =>
                  setPagination((current) => ({
                    ...current,
                    page: Math.max(1, current.page - 1),
                  }))
                }
                onPageSizeChange={(pageSize) =>
                  setPagination({ page: 1, pageSize })
                }
              />
            }
          />
        )}
      </QuerySection>
    </PageShell>
  );
}

export function ChatbotKnowledgeWorkspace() {
  return (
    <CapabilityGate
      capability={permissionCodes.chatbotKnowledgeReadAll}
      mode="forbidden"
    >
      <ResourceWorkspace />
    </CapabilityGate>
  );
}
