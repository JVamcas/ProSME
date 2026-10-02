"use client";

import { ArrowUpToLine } from "lucide-react";
import { toast } from "sonner";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/ui/DataTable";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { Badge } from "@/shared/ui/Badge";
import type {
  NotificationTemplateTargetDetail,
  NotificationTemplateTargetSummary,
  NotificationTemplateVersionSummary,
} from "../api/NotificationTemplateSchemas";
import {
  useNotificationTemplateTarget,
  usePublishNotificationTemplate,
} from "./NotificationTemplateHooks";

function targetName(target: NotificationTemplateTargetSummary) {
  if (target.scope === "GLOBAL") return "Global";
  if (target.scope === "CATALOG") return target.catalogName ?? target.catalogKey ?? "Catalog";
  return target.eventKey ?? "Event";
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-navy/55">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-brand-navy">{value}</p>
    </div>
  );
}

function VersionBadge({ status }: { status: NotificationTemplateVersionSummary["status"] }) {
  const variant = status === "PUBLISHED"
    ? "success"
    : status === "DRAFT"
      ? "gold"
      : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function versionColumns({
  canPublish,
  onPublish,
  publishing,
}: {
  canPublish: boolean;
  onPublish: (versionId: string, versionNumber: number) => void;
  publishing: boolean;
}): DataTableColumn<NotificationTemplateVersionSummary>[] {
  return [
    {
      accessorKey: "versionNumber",
      header: "Version",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">
          v{row.original.versionNumber}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <VersionBadge status={row.original.status} />,
    },
    {
      accessorKey: "sourceFileName",
      header: "Source file",
    },
    {
      accessorKey: "createdAt",
      header: "Imported at",
      cell: ({ row }) => formatLocalDateTime24(row.original.createdAt),
    },
    {
      accessorKey: "publishedAt",
      header: "Published at",
      cell: ({ row }) => formatLocalDateTime24(row.original.publishedAt),
    },
    {
      id: "actions",
      enableSorting: false,
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex justify-start">
          {row.original.status === "DRAFT" && canPublish ? (
            <GeneralButton
              aria-label={`Publish version ${row.original.versionNumber}`}
              disabled={publishing}
              onClick={() => onPublish(
                row.original.id,
                row.original.versionNumber,
              )}
              size="icon-compact"
              variant="outline"
            >
              <ArrowUpToLine aria-hidden="true" className="size-4" />
            </GeneralButton>
          ) : (
            <span className="text-sm text-brand-navy/40">—</span>
          )}
        </div>
      ),
    },
  ];
}

export function NotificationTemplateWorkspace({
  canPublish,
  channelCode,
  initialData,
  targetId,
}: {
  canPublish: boolean;
  channelCode: string;
  initialData: NotificationTemplateTargetDetail;
  targetId: string;
}) {
  const query = useNotificationTemplateTarget(channelCode, targetId, initialData);
  const publish = usePublishNotificationTemplate(channelCode, targetId);

  if (query.isPending) {
    return <PortalLoadingState description="Just a moment..." title="" />;
  }
  if (query.error || !query.data) {
    return (
      <PortalErrorState
        description={query.error?.message ?? "Template target not found."}
        title={query.error?.name ?? "Unable to load template"}
      />
    );
  }

  const { target, versions } = query.data;
  const published = versions.find((version) => version.status === "PUBLISHED");

  async function publishVersion(versionId: string, versionNumber: number) {
    try {
      await publish.mutateAsync(versionId);
      toast.success(`Version ${versionNumber} published.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish template.");
    }
  }

  const columns = versionColumns({
    canPublish,
    onPublish: (versionId, versionNumber) => {
      void publishVersion(versionId, versionNumber);
    },
    publishing: publish.isPending,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-brand-navy/10 bg-brand-white p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-3">
          <SummaryField label="Template name" value={target.label} />
          <SummaryField label="Target" value={targetName(target)} />
          <SummaryField
            label="Published version"
            value={published ? `v${published.versionNumber}` : "No published version"}
          />
        </div>
        {target.description ? (
          <p className="mt-5 max-w-4xl text-sm leading-6 text-brand-navy/65">
            {target.description}
          </p>
        ) : null}
      </section>

      <section className="rounded-t-[1.75rem] border border-brand-navy/10 bg-brand-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-navy/10 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-brand-navy">Version history</h2>
              <Badge variant="outline">
                {versions.length} version{versions.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-brand-navy/60">
              {published ? `Published v${published.versionNumber}` : "No published version"}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <DataTable
            columns={columns}
            data={versions}
            density="compact"
            emptyMessage="No versions have been imported yet."
            minWidth={840}
            rowKey={(version) => version.id}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-brand-cream/50 p-5">
        <h2 className="font-bold text-brand-navy">Available template fields</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {query.data.allowedFields.map((field) => (
            <code
              className="rounded-lg bg-brand-white px-2.5 py-1.5 text-xs text-brand-navy"
              key={field}
            >
              {`{{${field}}}`}
            </code>
          ))}
        </div>
      </section>
    </div>
  );
}
