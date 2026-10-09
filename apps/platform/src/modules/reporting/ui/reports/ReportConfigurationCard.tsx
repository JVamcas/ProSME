import {
  CalendarDays,
  Database,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/shared/ui/Badge";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { ConfiguredReportDetails } from "../../domain/Report";
import {
  reportParameterName,
  reportPeriodPresentation,
  reportSavedParameterValue,
} from "./ReportConfigurationPresentation";

type ParameterRow = {
  name: string;
  label: string;
  value: string;
  detail?: string;
};

const columns: DataTableColumn<ParameterRow>[] = [
  {
    id: "parameter",
    header: "Parameter",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="space-y-1 py-1">
        <p className="font-medium text-brand-navy">{row.original.label}</p>
        <p className="text-xs text-brand-navy/55">{row.original.name}</p>
      </div>
    ),
  },
  {
    id: "default",
    header: "Default value",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="space-y-1 py-1">
        <p className="font-medium text-brand-navy">{row.original.value}</p>
        {row.original.detail ? (
          <p className="text-xs text-brand-navy/55">{row.original.detail}</p>
        ) : null}
      </div>
    ),
  },
];

function ConfigurationItem({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-brand-navy/50"
      />
      <div className="min-w-0 space-y-2">
        <dt className="text-sm text-brand-navy/60">{label}</dt>
        <dd className="space-y-1 text-sm font-medium text-brand-navy">
          {children}
        </dd>
      </div>
    </div>
  );
}

function Version({ value }: { value: number }) {
  return (
    <Badge variant="outline" className="rounded-md text-xs">
      v{value}
    </Badge>
  );
}

export function ReportConfigurationCard({
  report,
}: {
  report: ConfiguredReportDetails;
}) {
  const period = reportPeriodPresentation[report.defaults.period];
  const parameters = report.definition.parameters.map((parameter) => {
    const value = reportSavedParameterValue(report, parameter);
    return {
      name: parameter.name,
      label: reportParameterName(parameter.name),
      value: value.label,
      detail: value.detail,
    };
  });
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand-navy/10 bg-white p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-brand-navy">
            Report configuration
          </h2>
          <Version value={report.reportVersion} />
        </div>
        <p className="mt-1 text-sm text-brand-navy/60">
          Saved settings for this report
        </p>
        <dl className="mt-6 grid gap-6 md:grid-cols-3 md:divide-x md:divide-brand-navy/10 [&>div:not(:first-child)]:md:pl-6">
          <ConfigurationItem icon={Database} label="Dataset">
            <div className="flex flex-wrap items-center gap-2">
              <span>{report.datasetName}</span>
              <Version value={report.definition.datasetVersion} />
            </div>
            <p className="break-all text-xs font-normal text-brand-navy/55">
              {report.definition.datasetKey}
            </p>
          </ConfigurationItem>
          <ConfigurationItem icon={FileText} label="Report template">
            <div className="flex flex-wrap items-center gap-2">
              <span>{report.templateName}</span>
              <Version value={report.templateVersion} />
            </div>
          </ConfigurationItem>
          <ConfigurationItem icon={FileSpreadsheet} label="Default format">
            {report.format === "XLSX" ? "Excel (.xlsx)" : "CSV (.csv)"}
          </ConfigurationItem>
        </dl>
        <dl className="mt-6 border-t border-brand-navy/10 pt-6">
          <ConfigurationItem icon={CalendarDays} label="Default period">
            <p>{period.label}</p>
            <p className="text-sm font-normal leading-6 text-brand-navy/60">
              {period.description}
            </p>
          </ConfigurationItem>
        </dl>
      </section>
      <DataTable
        columns={columns}
        data={parameters}
        rowKey={(parameter) => parameter.name}
        minWidth={420}
        toolbar={{
          title: "Default parameters",
          description: "Values used when generating this report",
        }}
        emptyMessage="This report has no parameters."
      />
    </div>
  );
}
