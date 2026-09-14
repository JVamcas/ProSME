"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { PortalErrorState } from "@/components/layout/portal-error-state";
import { PortalLoadingState } from "@/components/layout/portal-loading-state";
import { GeneralButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { ApplicationListContent } from "./ApplicationListContent";
import {
  applicationPageSize,
  type ApplicationFilter,
  useApplicationBrowser,
} from "./useApplicationBrowser";

type ApplicationTab = ApplicationFilter | "submitted" | "review" | "completed";

function applicationTabs(total: number): TabItem<ApplicationTab>[] {
  return [
    { id: "all", label: `All (${total})` },
    { id: "draft", label: `Drafts (${total})` },
    { disabled: true, id: "submitted", label: "Submitted (0)" },
    { disabled: true, id: "review", label: "Under review (0)" },
    { disabled: true, id: "completed", label: "Completed (0)" },
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
        items={applicationTabs(query.data.total)}
        onSelectionChange={(id) => {
          if (id === "all" || id === "draft") browser.selectFilter(id);
        }}
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
