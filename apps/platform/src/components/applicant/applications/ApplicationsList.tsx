"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import type { ApplicationStatusCounts } from "@/modules/applications/ApplicationTypes";
import { ApplicationListContent } from "./ApplicationListContent";
import {
  applicationPageSize,
  type ApplicationFilter,
  useApplicationBrowser,
} from "./useApplicationBrowser";

export function applicationTabs(
  counts: ApplicationStatusCounts,
): TabItem<ApplicationFilter>[] {
  return [
    { id: "all", label: `All (${counts.all})` },
    { id: "draft", label: `Drafts (${counts.draft})` },
    { id: "submitted", label: `Submitted (${counts.submitted})` },
    { id: "review", label: `Under review (${counts.underReview})` },
    { id: "completed", label: `Completed (${counts.completed})` },
  ];
}

export function ApplicationsList({ canCreate }: { canCreate: boolean }) {
  const browser = useApplicationBrowser();
  const { query } = browser;
  if (query.isPending) {
    return (
      <PortalLoadingState
        title="Loading applications"
        description="Your applications are being prepared."
      />
    );
  }
  if (query.isError) {
    return (
      <PortalErrorState
        title="Applications could not be loaded"
        description={query.error.message}
        onAction={() => void query.refetch()}
      />
    );
  }
  const content = <ApplicationListContent items={query.data.items} />;
  return (
    <section className="mt-6">
      <div className="mb-5 flex justify-end">
        {canCreate ? (
          <GeneralButton asChild>
            <Link href="/portal/applications/new">
              <Plus aria-hidden="true" className="size-4" />
              New application
            </Link>
          </GeneralButton>
        ) : null}
      </div>
      <Tabs
        ariaLabel="Application status"
        defaultSelectedId="all"
        items={applicationTabs(query.data.counts)}
        onSelectionChange={browser.selectFilter}
        selectedContent={content}
        selectedId={browser.filter}
      />
      <Pagination
        hasNextPage={Boolean(query.data.nextCursor)}
        onNext={browser.nextPage}
        onPrevious={browser.previousPage}
        page={browser.pageIndex + 1}
        pageSize={applicationPageSize}
        total={query.data.total}
      />
    </section>
  );
}
