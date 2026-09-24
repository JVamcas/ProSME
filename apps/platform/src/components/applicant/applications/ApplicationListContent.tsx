"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useDeleteApplicationDraft } from "@/modules/applications/ApplicationHooks";
import type { ApplicationSummary } from "@/modules/applications/ApplicationTypes";
import { ApplicationWithdrawalForm } from "@/modules/applications/ui/ApplicationWithdrawalForm";
import { ApplicationStatusHistoryPanel } from "@/modules/applications/ui/ApplicationStatusHistoryPanel";
import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";
import { toast } from "@/shared/ui/Toast";
import { ApplicationCards, ApplicationsTable } from "./ApplicationTable";

export function ApplicationListContent({
  canDeleteDraft,
  canWithdraw = false,
  items,
  onDeletedLastItem,
}: {
  canDeleteDraft: boolean;
  canWithdraw?: boolean;
  items: ApplicationSummary[];
  onDeletedLastItem?: () => void;
}) {
  const router = useRouter();
  const deleteDraft = useDeleteApplicationDraft();
  const [deleteCandidate, setDeleteCandidate] = useState<ApplicationSummary | null>(
    null,
  );
  const [withdrawCandidate, setWithdrawCandidate] = useState<ApplicationSummary | null>(
    null,
  );
  const [historyCandidate, setHistoryCandidate] = useState<ApplicationSummary | null>(
    null,
  );

  function renderAction(application: ApplicationSummary) {
    const isDraft = application.status === "draft";
    const actions: ActionMenuItem[] = [
      {
        id: "edit",
        label: "Edit",
        disabled: !isDraft,
        onAction: () => router.push(`/portal/applications/${application.id}/edit`),
      },
    ];

    if (!isDraft) {
      actions.push({
        id: "history",
        label: "Status history",
        onAction: () => setHistoryCandidate(application),
      });
    }

    if (canWithdraw && application.canWithdraw) {
      actions.push({
        id: "withdraw",
        label: "Withdraw",
        onAction: () => setWithdrawCandidate(application),
      });
    }

    if (isDraft && canDeleteDraft) {
      actions.push({
        id: "delete",
        label: "Delete application",
        destructive: true,
        onAction: () => {
          deleteDraft.reset();
          setDeleteCandidate(application);
        },
      });
    }

    return (
      <ActionMenu
        items={actions}
        label={`Actions for ${application.fundingOpportunityTitle}`}
      />
    );
  }

  return (
    <>
      {items.length ? (
        <>
          <ApplicationsTable items={items} />
          <ApplicationCards items={items} renderAction={renderAction} />
        </>
      ) : (
        <EmptyState
          title="No applications yet"
          message="Choose an open funding opportunity to start an application."
        />
      )}
      {historyCandidate ? (
        <ApplicationStatusHistoryPanel
          application={historyCandidate}
          onClose={() => setHistoryCandidate(null)}
        />
      ) : null}
      {withdrawCandidate ? (
        <ApplicationWithdrawalForm
          application={withdrawCandidate}
          onCancel={() => setWithdrawCandidate(null)}
          onWithdrawn={() => {
            setWithdrawCandidate(null);
            toast.success("Application withdrawn");
          }}
        />
      ) : null}
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
