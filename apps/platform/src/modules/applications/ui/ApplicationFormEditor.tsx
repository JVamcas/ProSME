"use client";

import { RefreshCw, RotateCw } from "lucide-react";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { PageShell } from "@/shared/ui/PageShell";
import { useOwnApplication } from "../ApplicationHooks";
import {
  type DraftSaveStatus,
  useApplicationAutosave,
} from "./useApplicationAutosave";

const statusLabels: Record<DraftSaveStatus, string> = {
  conflict: "Conflict — a newer draft exists",
  failed: "Failed — changes are not saved",
  offline: "Offline — changes are not saved",
  saved: "Saved",
  saving: "Saving…",
};

function DraftPersistenceStatus({ status }: { status: DraftSaveStatus }) {
  return (
    <p
      aria-live="polite"
      className={status === "saved"
        ? "text-sm font-semibold text-brand-green"
        : "text-sm font-semibold text-brand-navy"}
    >
      {statusLabels[status]}
    </p>
  );
}

function LoadedApplicationDraft({
  applicationId,
  onReload,
  data,
}: {
  applicationId: string;
  data: NonNullable<ReturnType<typeof useOwnApplication>["data"]>;
  onReload: () => void;
}) {
  const autosave = useApplicationAutosave(applicationId, data);
  return (
    <PageShell
      description="Your answers save automatically to this application draft."
      eyebrow="Funding application draft"
      title={data.fundingOpportunityTitle}
    >
      <div className="mt-6 space-y-5 rounded-2xl border border-brand-navy/15 bg-brand-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-navy/10 pb-4">
          <DraftPersistenceStatus status={autosave.status} />
          {autosave.status === "failed" ? (
            <GeneralButton onClick={autosave.retry} size="sm" variant="outline">
              <RotateCw aria-hidden="true" className="size-4" />
              Retry save
            </GeneralButton>
          ) : null}
          {autosave.status === "conflict" ? (
            <GeneralButton onClick={onReload} size="sm" variant="outline">
              <RefreshCw aria-hidden="true" className="size-4" />
              Load newer draft
            </GeneralButton>
          ) : null}
        </div>
        {autosave.error && autosave.status === "failed" ? (
          <p className="text-sm text-red-700" role="alert">
            {autosave.error.message}
          </p>
        ) : null}
        <FormRenderer
          definition={data.form}
          formData={autosave.values}
          onChange={autosave.setValues}
          onSubmit={() => undefined}
          readOnly={data.status !== "draft"}
        >
          <></>
        </FormRenderer>
      </div>
    </PageShell>
  );
}

export function ApplicationFormEditor({
  applicationId,
}: {
  applicationId: string;
}) {
  const application = useOwnApplication(applicationId);
  if (application.isPending) {
    return (
      <PortalLoadingState
        description="Your exact saved form and latest answers are being prepared."
        title="Loading application"
      />
    );
  }
  if (application.isError || !application.data) {
    return (
      <PortalErrorState
        description={application.error?.message ?? "This draft is unavailable."}
        onAction={() => void application.refetch()}
        title="Application could not be loaded"
      />
    );
  }
  return (
    <LoadedApplicationDraft
      applicationId={applicationId}
      data={application.data}
      key={application.data.draftResponse.rowVersion}
      onReload={() => void application.refetch()}
    />
  );
}
