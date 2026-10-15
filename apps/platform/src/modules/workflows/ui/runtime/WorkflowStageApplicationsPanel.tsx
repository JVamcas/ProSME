"use client";

import { useState } from "react";
import { GeneralButton } from "@/shared/ui/Button";
import { DataTable } from "@/shared/ui/DataTable";
import { Pagination } from "@/shared/ui/Pagination";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useWorkflowStageApplications } from "./useWorkflowStageFunnel";
import { workflowStageApplicationColumns } from "./WorkflowStageApplicationColumns";

export function WorkflowStageApplicationsPanel({
  applicationId,
  stageKey,
  stageName,
  fundingCallTitle,
  onClose,
}: {
  applicationId: string;
  stageKey: string;
  stageName: string;
  fundingCallTitle: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const query = useWorkflowStageApplications(applicationId, {
    stageKey,
    page,
    pageSize: 25,
  });
  return (
    <section
      aria-label="Applications at selected stage"
      className="min-w-0 rounded-xl border border-brand-navy/10 p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-brand-navy">{stageName}</h3>
          <p className="mt-1 text-sm text-brand-navy/65">
            {fundingCallTitle} · All workflow versions
          </p>
          {query.data ? (
            <p className="mt-1 text-sm text-brand-navy/65">
              {query.data.total.toLocaleString()} applications reached this
              stage
            </p>
          ) : null}
        </div>
        <GeneralButton onClick={onClose} size="compact" variant="outline">
          Stage details
        </GeneralButton>
      </div>
      <QuerySection
        query={query}
        title="stage applications"
        loading={<Skeleton className="h-48 w-full" />}
      >
        {(data) => (
          <>
            <DataTable
              columns={workflowStageApplicationColumns}
              data={data.items}
              density="compact"
              emptyMessage="No applications have reached this stage."
              rowKey={(item) => item.applicationId}
            />
            <Pagination
              disabled={query.isFetching}
              hasNextPage={page * 25 < data.total}
              onNext={() => setPage((value) => value + 1)}
              onPrevious={() => setPage((value) => value - 1)}
              page={page}
              pageSize={25}
              total={data.total}
            />
          </>
        )}
      </QuerySection>
      <p className="mt-3 text-xs text-brand-navy/60">
        Latest run per application. Scores average the configured aggregate results
        of completed reviews on the same scale. Comments come from Comment fields.
        Unreleased peer evidence is excluded.
      </p>
    </section>
  );
}
