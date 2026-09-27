"use client";

import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { Badge } from "@/shared/ui/Badge";
import { NotificationTemplateImportForm } from "./NotificationTemplateImportForm";
import {
  useNotificationTemplateTarget,
  usePublishNotificationTemplate,
} from "./NotificationTemplateHooks";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { PortalErrorState } from "@/components/layout/PortalErrorState";

export function NotificationTemplateWorkspace({
  canImport,
  canPublish,
  channelCode,
  targetId,
}: {
  canImport: boolean;
  canPublish: boolean;
  channelCode: string;
  targetId: string;
}) {
  const query = useNotificationTemplateTarget(channelCode, targetId);
  const publish = usePublishNotificationTemplate(channelCode, targetId);
  if (query.isPending) return <PortalLoadingState title="" description="Just a moment..."/>
  if (query.error) {
    return <PortalErrorState title={query.error?.name} description={query.error?.message}/>
  }
  async function publishVersion(versionId: string, versionNumber: number) {
    try {
      await publish.mutateAsync(versionId);
      toast.success(`Version ${versionNumber} published.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish template.");
    }
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-4">
        <div className="rounded-2xl bg-brand-cream/50 p-5">
          <h2 className="font-bold text-brand-navy">Allowed fields</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {query.data?.allowedFields.map((field) => (
              <code className="rounded bg-white px-2 py-1 text-xs text-brand-navy" key={field}>
                {`{{${field}}}`}
              </code>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white">
          <div className="border-b border-brand-navy/10 px-5 py-4">
            <h2 className="text-lg font-bold text-brand-navy">Version history</h2>
          </div>
          <div className="divide-y divide-brand-navy/10">
            {query.data?.versions.length ? query.data.versions.map((version) => (
              <article className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" key={version.id}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-brand-navy">Version {version.versionNumber}</h3>
                    <Badge variant={version.status === "PUBLISHED" ? "success" : "outline"}>
                      {version.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-brand-navy/65">{version.subjectTemplate}</p>
                  <p className="mt-1 text-xs text-brand-navy/50">
                    {version.sourceFileName} · {new Date(version.createdAt).toLocaleString()}
                  </p>
                </div>
                {version.status === "DRAFT" && canPublish ? (
                  <GeneralButton
                    disabled={publish.isPending}
                    onClick={() => void publishVersion(version.id, version.versionNumber)}
                    size="sm"
                  >
                    Publish
                  </GeneralButton>
                ) : null}
              </article>
            )) : (
              <p className="p-5 text-sm text-brand-navy/60">No versions imported.</p>
            )}
          </div>
        </div>
      </section>
      <aside>
        {canImport ? (
          <NotificationTemplateImportForm
            channelCode={channelCode}
            targetId={targetId}
          />
        ) : (
          <p className="rounded-2xl bg-brand-cream/50 p-5 text-sm text-brand-navy/70">
            You can inspect versions but do not have template import permission.
          </p>
        )}
      </aside>
    </div>
  );
}
