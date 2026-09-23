"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useDeleteApplicationDraft } from "@/modules/applications/ApplicationHooks";
import type { ApplicationSummary } from "@/modules/applications/ApplicationTypes";
import { toast } from "@/shared/ui/Toast";
import { ApplicationCards, ApplicationsTable } from "./ApplicationTable";

export function ApplicationListContent({
  canDeleteDraft,
  items,
  onDeletedLastItem,
}: {
  canDeleteDraft: boolean;
  items: ApplicationSummary[];
  onDeletedLastItem?: () => void;
}) {
  const router = useRouter();
  const deleteDraft = useDeleteApplicationDraft();
  const [deleteCandidate, setDeleteCandidate] = useState<ApplicationSummary | null>(
    null,
  );

  function renderAction(application: ApplicationSummary) {
    const isDraft = application.status === "draft";
    return (
      <div className="flex items-center gap-2">
        <EditButton
          disabled={!isDraft}
          onClick={() => router.push(`/portal/applications/${application.id}/edit`)}
        />
        {isDraft && canDeleteDraft ? (
          <DeleteButton
            onClick={() => {
              deleteDraft.reset();
              setDeleteCandidate(application);
            }}
            title="Delete draft application"
          />
        ) : null}
      </div>
    );
  }

  return (
    <>
      {items.length ? (
        <>
          <ApplicationsTable items={items} renderAction={renderAction} />
          <ApplicationCards items={items} renderAction={renderAction} />
        </>
      ) : (
        <EmptyState
          title="No applications yet"
          message="Choose an open funding opportunity to start an application."
        />
      )}
      <ConfirmationDialog
        confirmText="Delete draft"
        errorMessage={deleteDraft.error?.message}
        isDangerous
        isLoading={deleteDraft.isPending}
        isOpen={Boolean(deleteCandidate)}
        loadingText="Deleting…"
        message={deleteCandidate
          ? `Delete your draft for ${deleteCandidate.fundingOpportunityTitle}? This draft will be removed from your applications.`
          : ""}
        onCancel={() => {
          if (deleteDraft.isPending) return;
          setDeleteCandidate(null);
          deleteDraft.reset();
        }}
        onConfirm={() => {
          if (!deleteCandidate) return;
          deleteDraft.mutate(deleteCandidate.id, {
            onSuccess: () => {
              setDeleteCandidate(null);
              if (items.length === 1) onDeletedLastItem?.();
              toast.success("Draft application deleted");
            },
          });
        }}
        title="Delete draft application"
      />
    </>
  );
}
