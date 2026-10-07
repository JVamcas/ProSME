"use client";

import { GeneralButtonLink } from "@/components/ui/button";
import { useState } from "react";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import type { WebsiteReportFrequency } from "../../domain/WebsiteReport";
import { WebsiteReportHistoryTable } from "./WebsiteReportHistoryTable";
import { useWebsiteReports } from "./useWebsiteReports";

type ReportView = "ALL" | WebsiteReportFrequency;

const views: TabItem<ReportView>[] = [
  { id: "ALL", label: "All reports" },
  { id: "BIWEEKLY", label: "Bi-weekly" },
  { id: "MONTHLY", label: "Monthly" },
];

export function WebsiteReportsWorkspace({
  canConfigure,
}: {
  canConfigure: boolean;
}) {
  const [view, setView] = useState<ReportView>("ALL");
  const [page, setPage] = useState(1);
  const frequency = view === "ALL" ? undefined : view;
  const query = useWebsiteReports({ frequency, page, pageSize: 20 });

  return (
    <PageShell
      title="Website reports"
      description="Saved bi-weekly and monthly website analytics reports"
      eyebrow="Operations / Reporting"
      actions={
        canConfigure ? (
          <GeneralButtonLink
            variant="outline"
            size="compact"
            href="/admin/reports/settings"
          >
            Report settings
          </GeneralButtonLink>
        ) : null
      }
    >
      <Tabs
        ariaLabel="Report frequency"
        defaultSelectedId="ALL"
        selectedId={view}
        items={views}
        onSelectionChange={(selected) => {
          setView(selected);
          setPage(1);
        }}
        selectedContent={
          <QuerySection
            query={query}
            title="website reports"
            loading={
              <PortalLoadingState title="" description="Just a moment..." />
            }
          >
            {(history) => (
              <WebsiteReportHistoryTable
                history={history}
                page={page}
                refreshing={query.isFetching}
                onPrevious={() => setPage((value) => value - 1)}
                onNext={() => setPage((value) => value + 1)}
              />
            )}
          </QuerySection>
        }
      />
    </PageShell>
  );
}
