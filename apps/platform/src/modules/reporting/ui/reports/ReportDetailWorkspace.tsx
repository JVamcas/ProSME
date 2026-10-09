"use client";
import Link from "next/link";
import { useState } from "react";
import { PencilLine } from "lucide-react";
import { GeneralButton } from "@/components/ui/button";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { PageShell } from "@/shared/ui/PageShell";
import { Tabs } from "@/components/ui/tabs";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { permissionCodes } from "@/auth/authorization/permissions";
import { useReport } from "./useReports";
import { ReportConfigurationForm } from "./ReportConfigurationForm";
import { ReportConfigurationCard } from "./ReportConfigurationCard";
import { ManualReportRunForm } from "./ManualReportRunForm";
import { ReportRunsTable } from "./ReportRunsTable";
import { ReportRunDrawer } from "./ReportRunDrawer";

export function ReportDetailWorkspace({
  id,
  permissions,
}: {
  id: string;
  permissions: string[];
}) {
  const query = useReport(id);
  const [runId, setRunId] = useState<string>();
  const [tab, setTab] = useState("configuration");
  const [editingId, setEditingId] = useState<string>();
  const granted = new Set(permissions);
  const canEdit =
    granted.has(permissionCodes.reportingReportUpdateAll) &&
    granted.has(permissionCodes.reportingTemplateReadAll);
  return (
    <QuerySection
      query={query}
      title="report"
      loading={<Skeleton className="h-96" />}
    >
      {(report) => (
        <PageShell
          title={report.name}
          description={report.description}
          backLink={<Link href="/admin/reports">Reports</Link>}
          actions={
            canEdit ? (
              <GeneralButton onClick={() => setEditingId(id)}>
                <PencilLine aria-hidden="true" className="size-4" />
                Edit report
              </GeneralButton>
            ) : undefined
          }
        >
          <Tabs
            ariaLabel="Report"
            accent="orange"
            defaultSelectedId="configuration"
            selectedId={tab}
            onSelectionChange={setTab}
            items={[
              {
                id: "configuration",
                label: "Configuration",
                content: (
                  <div className="space-y-6">
                    <ReportConfigurationCard report={report} />
                    {granted.has(permissionCodes.reportingReportRunAll) &&
                    report.runDefaults ? (
                      <ManualReportRunForm
                        key={report.rowVersion}
                        report={report}
                        values={report.runDefaults}
                        onQueued={(id) => {
                          setRunId(id);
                          setTab("runs");
                        }}
                      />
                    ) : null}
                    {report.runDefaultsError ? (
                      <p role="alert">{report.runDefaultsError}</p>
                    ) : null}
                  </div>
                ),
              },
              ...(granted.has(permissionCodes.reportingRunReadAll)
                ? [
                    {
                      id: "runs",
                      label: "Runs",
                      content: (
                        <ReportRunsTable reportId={id} onSelect={setRunId} />
                      ),
                    },
                  ]
                : []),
            ]}
          />
          {canEdit ? (
            <RightDrawer
              title="Edit report"
              description="Update the saved configuration and default parameters."
              size="xl"
              open={editingId === id}
              onClose={() => setEditingId(undefined)}
            >
              <ReportConfigurationForm
                key={report.rowVersion}
                report={report}
                onSaved={() => setEditingId(undefined)}
                onCancel={() => setEditingId(undefined)}
              />
            </RightDrawer>
          ) : null}
          <ReportRunDrawer
            reportId={id}
            runId={runId}
            onClose={() => setRunId(undefined)}
            canDownload={granted.has(permissionCodes.reportingRunDownloadAll)}
          />
        </PageShell>
      )}
    </QuerySection>
  );
}
