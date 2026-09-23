"use client";

import { RefreshCw, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { ApplicationSubmissionConfirmation } from "@/components/applicant/applications/ApplicationSubmissionConfirmation";
import { GeneralButton } from "@/components/ui/button";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { PageShell } from "@/shared/ui/PageShell";
import { toast } from "@/shared/ui/Toast";
import { useOwnApplication, useSubmitApplication } from "../ApplicationHooks";
import type { ApplicationSubmission } from "../ApplicationTypes";
import { applicationDocumentCompletion } from "../domain/ApplicationDocumentPolicy";
import { attachedBusinessFieldKeys } from "../domain/AttachedApplicationForm";
import { ApplicationDocumentRegisterPanel } from "./ApplicationDocumentsPanel";
import { useApplicationDocuments } from "./useApplicationDocuments";
import { useApplicationPreflight } from "./useApplicationReadiness";
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
      className={
        status === "saved"
          ? "text-sm font-semibold text-brand-green"
          : "text-sm font-semibold text-brand-navy"
      }
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
  const documentRegister = useApplicationDocuments(applicationId);
  const preflight = useApplicationPreflight(applicationId);
  const submit = useSubmitApplication(applicationId);
  const [submission, setSubmission] = useState<ApplicationSubmission | null>(null);

  async function submitDraft() {
    if (autosave.status !== "saved" || preflight.isPending || submit.isPending) {
      return;
    }

    try {
      const readiness = await preflight.mutateAsync();
      if (!readiness.ready || !readiness.readinessToken) {
        toast.error("Application is not ready to submit", {
          description: readiness.blockers.map((blocker) => blocker.message).join(" ")
            || "Complete the outstanding requirements and try again.",
        });
        return;
      }

      const result = await submit.mutateAsync({
        expectedApplicationRowVersion: readiness.applicationRowVersion,
        finalConfirmation: true,
        readinessToken: readiness.readinessToken,
      });
      setSubmission(result);
    } catch (error) {
      toast.error("Application could not be submitted", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  useEffect(() => {
    if (autosave.error && autosave.status === "failed") {
      toast.error("Changes could not be saved", {
        description: autosave.error.message,
      });
    }
  }, [autosave.error, autosave.status]);

  if (documentRegister.isPending) {
    return (
      <PortalLoadingState
        description="Checking the document requirements for this application."
        title="Loading application"
      />
    );
  }
  if (documentRegister.isError || !documentRegister.data) {
    return (
      <PortalErrorState
        description={documentRegister.error?.message ?? "Document requirements are unavailable."}
        onAction={() => void documentRegister.refetch()}
        title="Application could not be loaded"
      />
    );
  }

  if (submission) {
    return <ApplicationSubmissionConfirmation submission={submission} />;
  }

  const hasDocuments = documentRegister.data.requirements.length > 0;
  const documentCompletion = applicationDocumentCompletion(documentRegister.data);
  const documents = hasDocuments
    ? (
        <ApplicationDocumentRegisterPanel
          applicationId={applicationId}
          readOnly={data.status !== "draft"}
          register={documentRegister.data}
        />
      )
    : null;

  return (
    <PageShell
      description="Manage your applications for fundings"
      eyebrow="Funding calls applications"
      title={data.fundingOpportunityTitle}
      actions={
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
      }
    >
      <div className="space-y-6">
        <FormRenderer
          definition={data.form}
          formData={autosave.values}
          onChange={autosave.setValues}
          onSubmit={() => void submitDraft()}
          penultimateStep={
            data.form.displayMode === "STEPS" && documents
              ? {
                  content: documents,
                  id: "supporting-documents",
                  title: "Supporting documents",
                }
              : undefined
          }
          readOnly={data.status !== "draft"}
          readOnlyFieldKeys={[...attachedBusinessFieldKeys]}
          stepPersistenceKey={`application:${applicationId}:form:${data.form.versionId}:step`}
          supplementalCompletion={
            hasDocuments
              ? {
                  completedCount: documentCompletion.completedCount,
                  id: "supporting-documents",
                  requiredCount: documentCompletion.requiredCount,
                  title: "Supporting documents",
                  unit: "document",
                }
              : undefined
          }
        >
          {data.status === "draft" ? (
            <div className="mt-5 flex flex-col items-end gap-3">
              <GeneralButton
                disabled={autosave.status !== "saved" || preflight.isPending || submit.isPending}
                type="submit"
              >
                {preflight.isPending || submit.isPending
                  ? "Submitting…"
                  : "Submit application"}
              </GeneralButton>
            </div>
          ) : null}
        </FormRenderer>
        {data.form.displayMode !== "STEPS" ? documents : null}
      </div>
    </PageShell>
  );
}

export function ApplicationFormEditor({
  applicationId,
}: {
  applicationId: string;
}) {
  const [reloadVersion, setReloadVersion] = useState(0);
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
      key={`${applicationId}:${reloadVersion}`}
      onReload={() => {
        void application.refetch().then((result) => {
          if (result.isSuccess) {
            setReloadVersion((version) => version + 1);
          }
        });
      }}
    />
  );
}
