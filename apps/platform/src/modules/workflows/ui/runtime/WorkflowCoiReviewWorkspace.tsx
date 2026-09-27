"use client";

import { Search, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { DataTableFilter } from "@/components/ui/data-table-filter";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/shared/ui/FormPrimitives";
import { PageShell } from "@/shared/ui/PageShell";
import { WorkflowCoiReviewDrawer } from "./WorkflowCoiReviewDrawer";
import { WorkflowCoiReviewTable } from "./WorkflowCoiReviewTable";
import { useWorkflowCoiReviews } from "./useWorkflowCoiReviews";

const PAGE_SIZE = 25;

export function WorkflowCoiReviewWorkspace() {
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const reviews = useWorkflowCoiReviews({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
  });
  const items = reviews.data?.items ?? [];
  const total = reviews.data?.total ?? 0;
  const emptyMessage = reviews.isPending
    ? "Loading conflict reviews…"
    : reviews.isError
      ? reviews.error.message
      : "No conflict disclosures are waiting for your review.";

  function applySearch() {
    setSearch(draftSearch.trim());
    setPage(1);
  }

  function clearSearch() {
    setDraftSearch("");
    setSearch("");
    setPage(1);
  }

  return (
    <PageShell
      description="Independently assess disclosed conflicts before assigned reviewers can continue."
      eyebrow="My work"
      icon={<ShieldCheck aria-hidden="true" />}
      title="Conflict reviews"
    >
      <section className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-sm">
        <div className="p-4">
          <DataTableFilter
            collapsible
            defaultExpanded={false}
            description="Search by task, stage, application reference or reviewer."
            onApply={applySearch}
            onClear={clearSearch}
            title="Review filters"
          >
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-orange" />
              <Input
                aria-label="Search conflict reviews"
                className="pl-10"
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Search task, reference or reviewer"
                value={draftSearch}
              />
            </div>
          </DataTableFilter>
        </div>
        <WorkflowCoiReviewTable
          emptyMessage={emptyMessage}
          items={items}
          onReview={setSelectedTaskId}
        />
        <div className="px-4 pb-5">
          <Pagination
            disabled={reviews.isFetching}
            hasNextPage={page * PAGE_SIZE < total}
            onNext={() => setPage((current) => current + 1)}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </div>
      </section>
      <WorkflowCoiReviewDrawer
        onClose={() => setSelectedTaskId(null)}
        onReviewed={() => setSelectedTaskId(null)}
        taskId={selectedTaskId}
      />
    </PageShell>
  );
}
