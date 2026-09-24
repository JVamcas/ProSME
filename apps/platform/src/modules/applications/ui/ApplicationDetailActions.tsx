"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";
import { toast } from "@/shared/ui/Toast";
import {
  useDeleteApplicationDraft,
} from "../ApplicationHooks";
import type { ApplicationSummary } from "../ApplicationTypes";
import { ApplicationWithdrawalForm } from "./ApplicationWithdrawalForm";

export function ApplicationDetailActions({
  application,
  canDeleteDraft,
  canWithdraw,
}: {
  application: ApplicationSummary;
  canDeleteDraft: boolean;
  canWithdraw: boolean;
}) {
  const router = useRouter();
  const deleteDraft = useDeleteApplicationDraft();
  const [showDelete, setShowDelete] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const isDraft = application.status === "draft";
  const actions: ActionMenuItem[] = [];

  if (isDraft && canDeleteDraft) {
    actions.push({
      id: "delete",
      label: "Delete draft",
      destructive: true,
      onAction: () => {
        deleteDraft.reset();
        setShowDelete(true);
      },
    });
  }

  return (
    <div className="flex items-center gap-2">
      {isDraft ? (
        <GeneralButtonLink
          href={`/portal/applications/${application.id}/edit`}
          size="compact"
          variant="outline"
        >
          <Pencil aria-hidden="true" className="size-3" />
          Edit
        </GeneralButtonLink>
      ) : null}
      {canWithdraw && application.canWithdraw ? (
        <GeneralButton
          onClick={() => setShowWithdraw(true)}
          size="compact"
          variant="outlineOrange"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Withdraw
        </GeneralButton>
      ) : null}
      {actions.length > 0 ? (
        <ActionMenu
          items={actions}
          label={`More actions for ${application.fundingOpportunityTitle}`}
        />
      ) : null}
      {showWithdraw ? (
        <ApplicationWithdrawalForm
          application={application}
          onCancel={() => setShowWithdraw(false)}
          onWithdrawn={() => {
            setShowWithdraw(false);
            toast.success("Application withdrawn");
            router.refresh();
          }}
        />
      ) : null}
      <ConfirmationDialog
        confirmText="Delete draft"
        errorMessage={deleteDraft.error?.message}
        isDangerous
        isLoading={deleteDraft.isPending}
        isOpen={showDelete}
        loadingText="Deleting…"
        message={`Delete your draft for ${application.fundingOpportunityTitle}? This cannot be undone.`}
        onCancel={() => {
          if (!deleteDraft.isPending) setShowDelete(false);
        }}
        onConfirm={() => {
          deleteDraft.mutate(application.id, {
            onSuccess: () => {
              toast.success("Draft application deleted");
              router.push("/portal/applications");
            },
          });
        }}
        title="Delete draft application"
      />
    </div>
  );
}
