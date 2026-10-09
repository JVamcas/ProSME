"use client";
import { Tabs } from "@/components/ui/tabs";
import { PageShell } from "@/shared/ui/PageShell";
import { permissionCodes } from "@/auth/authorization/permissions";
import { ReportDatasetTable } from "./ReportDatasetTable";
import { ReportTemplateTable } from "./ReportTemplateTable";

export function ReportDefinitionWorkspace({
  permissions,
}: {
  permissions: string[];
}) {
  const granted = new Set(permissions);
  const items = [];
  if (granted.has(permissionCodes.reportingDatasetReadAll)) {
    items.push({
      id: "datasets",
      label: "Datasets",
      content: <ReportDatasetTable />,
    });
  }
  if (granted.has(permissionCodes.reportingTemplateReadAll)) {
    items.push({
      id: "templates",
      label: "Report Templates",
      content: (
        <ReportTemplateTable
          canCreate={granted.has(permissionCodes.reportingTemplateCreateAll)}
        />
      ),
    });
  }
  return (
    <PageShell
    eyebrow="Reporting / Templates Definitions"
      title="Report Templates Definition"
      description="Approved datasets and reusable report templates"
    >
      <Tabs
        ariaLabel="Report Definition"
        defaultSelectedId={items[0]?.id ?? "datasets"}
        items={items}
      />
    </PageShell>
  );
}
