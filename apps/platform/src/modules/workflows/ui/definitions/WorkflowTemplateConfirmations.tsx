"use client";

import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import { toast } from "@/shared/ui/Toast";
import { getErrorMessage } from "@/lib/client-http";
import {
  useDeleteWorkflowTemplate,
  useWorkflowListLifecycle,
} from "../../WorkflowHooks";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";
import { showWorkflowPublicationError } from "./WorkflowPublicationErrorToast";

type Props = {
  deleteCandidate?: WorkflowTemplateListItem;
  publishCandidate?: WorkflowTemplateListItem;
  deleteTemplate: ReturnType<typeof useDeleteWorkflowTemplate>;
  publishTemplate: ReturnType<typeof useWorkflowListLifecycle>;
  setDeleteCandidate: (value: WorkflowTemplateListItem | undefined) => void;
  setPublishCandidate: (value: WorkflowTemplateListItem | undefined) => void;
  onDeleted: () => void;
};

export function WorkflowTemplateConfirmations({
  deleteCandidate,
  publishCandidate,
  deleteTemplate,
  publishTemplate,
  setDeleteCandidate,
  setPublishCandidate,
  onDeleted,
}: Props) {
  return (
    <>
      <ConfirmationDialog
        confirmLabel="Publish"
        isOpen={Boolean(publishCandidate)}
        isPending={publishTemplate.isPending}
        message={
          publishCandidate
            ? `Publish ${publishCandidate.name} version ${publishCandidate.currentVersion.number}? Published workflow versions cannot be edited.`
            : ""
        }
        onClose={() => setPublishCandidate(undefined)}
        onConfirm={() => {
          if (!publishCandidate) return;
          publishTemplate.mutate(publishCandidate.id, {
            onError: showWorkflowPublicationError,
            onSuccess: () => setPublishCandidate(undefined),
          });
        }}
        pendingLabel="Publishing…"
        title="Publish workflow template"
      />
      <ConfirmationDialog
        confirmLabel="Delete"
        isOpen={Boolean(deleteCandidate)}
        isPending={deleteTemplate.isPending}
        message={
          deleteCandidate
            ? `Delete ${deleteCandidate.name}? This cannot be undone.`
            : ""
        }
        onClose={() => setDeleteCandidate(undefined)}
        onConfirm={() => {
          if (!deleteCandidate) return;
          deleteTemplate.mutate(deleteCandidate, {
            onError: (error) => {
              toast.error(
                getErrorMessage(error) ?? "Unable to delete the workflow.",
              );
            },
            onSuccess: () => {
              setDeleteCandidate(undefined);
              onDeleted();
            },
          });
        }}
        pendingLabel="Deleting…"
        title="Delete workflow template"
      />
    </>
  );
}
