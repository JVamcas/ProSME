"use client";

import { ArrowUpToLine } from "lucide-react";
import { toast } from "sonner";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
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

function VersionRow({
  canPublish,
  onPublish,
  publishing,
  version,
}: {
  canPublish: boolean;
  onPublish: () => void;
  publishing: boolean;
  version: NotificationTemplateVersionSummary;
}) {
  return (
    <tr className="border-t border-brand-navy/10">
      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-brand-navy">
        v{version.versionNumber}
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <VersionBadge status={version.status} />
      </td>
      <td className="min-w-52 px-4 py-4 text-sm text-brand-navy/75">
        {version.sourceFileName}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm text-brand-navy/65">
        {formatLocalDateTime24(version.createdAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-sm text-brand-navy/65">
        {formatLocalDateTime24(version.publishedAt)}
      </td>
      <td className="px-4 py-4 text-right">
        {version.status === "DRAFT" && canPublish ? (
          <GeneralButton
            aria-label={`Publish version ${version.versionNumber}`}
            disabled={publishing}
            onClick={onPublish}
            size="icon-compact"
            variant="outline"
          >
            <ArrowUpToLine aria-hidden="true" className="size-4" />
          </GeneralButton>
        ) : (
          <span className="text-sm text-brand-navy/40">—</span>
        )}
      </td>
    </tr>
  );
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

      <section className="rounded-[1.75rem] border border-brand-navy/10 bg-brand-white p-5 shadow-sm sm:p-6">
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
        {versions.length ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-brand-navy/10">
            <table className="w-full border-collapse text-left">
              <thead className="bg-brand-cream/50">
                <tr className="text-xs font-bold text-brand-navy/65">
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source file</th>
                  <th className="px-4 py-3">Imported at</th>
                  <th className="px-4 py-3">Published at</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <VersionRow
                    canPublish={canPublish}
                    key={version.id}
                    onPublish={() => void publishVersion(
                      version.id,
                      version.versionNumber,
                    )}
                    publishing={publish.isPending}
                    version={version}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-brand-navy/60">
            No versions have been imported yet.
          </p>
        )}
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
