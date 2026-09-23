"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import {
  useCloneWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useWorkflowListLifecycle,
  useWorkflowTemplates,
} from "../../WorkflowHooks";
import {
  WorkflowPublicationValidationError,
  workflowValidationIssueLocation,
  workflowValidationIssueMessage,
} from "../../WorkflowPublicationValidationFeedback";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";
import { WorkflowTemplateCreateForm } from "./WorkflowTemplateCreateForm";
import { WorkflowTemplateTable } from "./WorkflowTemplateTable";

function showPublicationError(error: Error) {
  if (!(error instanceof WorkflowPublicationValidationError)) {
    toast.error("Workflow could not be published", {
      description: error.message,
      duration: 10_000,
    });
    return;
  }

  const visibleIssues = error.issues.slice(0, 3);
  const remaining = error.issues.length - visibleIssues.length;
  toast.error(
    `Fix ${error.issues.length} workflow validation ${error.issues.length === 1 ? "issue" : "issues"}`,
    {
      description: (
        <div className="space-y-2">
          <ul className="list-disc space-y-1 pl-4">
            {visibleIssues.map((issue, index) => (
              <li key={`${issue.code}-${issue.path}-${index}`}>
                <span className="font-semibold">
                  {workflowValidationIssueLocation(issue, error.graph)}:
                </span>{" "}
                {workflowValidationIssueMessage(issue)}
              </li>
            ))}
          </ul>
          <p>
            {remaining > 0
              ? `${remaining} more ${remaining === 1 ? "issue requires" : "issues require"} attention. `
              : ""}
            Open the workflow editor to correct the configuration.
          </p>
        </div>
      ),
      duration: 12_000,
    },
  );
}

type Props = {
  canCreate: boolean;
  canPublish: boolean;
  canUpdate: boolean;
};

export function WorkflowTemplateAdminWorkspace({
  canCreate,
  canPublish,
  canUpdate,
}: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplateListItem>();
  const [deleteCandidate, setDeleteCandidate] =
    useState<WorkflowTemplateListItem>();
  const [publishCandidate, setPublishCandidate] =
    useState<WorkflowTemplateListItem>();
  const templates = useWorkflowTemplates();
  const cloneTemplate = useCloneWorkflowTemplate();
  const deleteTemplate = useDeleteWorkflowTemplate();
  const publishTemplate = useWorkflowListLifecycle("publish");
  const emptyMessage = templates.isLoading
    ? "Loading workflow templates…"
    : (templates.error?.message ??
      "No workflow templates yet. Create a template to begin.");

  return (
    <div className="space-y-4">
      {canCreate ? (
        <div className="flex justify-end">
          <GeneralButton
            onClick={() => {
              setSelectedTemplate(undefined);
              setIsDialogOpen(true);
            }}
            size="sm"
          >
            <Plus className="size-4" />
            Create template
          </GeneralButton>
        </div>
      ) : null}
      <WorkflowTemplateTable
        canPublish={canPublish}
        canUpdate={canUpdate}
        cloningId={
          cloneTemplate.isPending ? cloneTemplate.variables?.id : undefined
        }
        deletingId={
          deleteTemplate.isPending ? deleteTemplate.variables?.id : undefined
        }
        emptyMessage={emptyMessage}
        items={templates.data ?? []}
        onClone={(template) => cloneTemplate.mutate(template)}
        onDelete={setDeleteCandidate}
        onEdit={(template) => {
          setSelectedTemplate(template);
          setIsDialogOpen(true);
        }}
        onPublish={setPublishCandidate}
        publishingId={
          publishTemplate.isPending ? publishTemplate.variables : undefined
        }
      />
      {cloneTemplate.error || deleteTemplate.error ? (
        <p className="text-sm text-red-700" role="alert">
          {(cloneTemplate.error ?? deleteTemplate.error)?.message}
        </p>
      ) : null}
      <DraggableDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={selectedTemplate
          ? "Edit workflow template"
          : "Create workflow template"}
      >
        <WorkflowTemplateCreateForm
          key={selectedTemplate?.currentVersion.id ?? "create"}
          onCompleted={() => setIsDialogOpen(false)}
          template={selectedTemplate}
        />
      </DraggableDialog>
      <ConfirmationDialog
        confirmLabel="Publish"
        isOpen={Boolean(publishCandidate)}
        isPending={publishTemplate.isPending}
        message={publishCandidate
          ? `Publish ${publishCandidate.name} version ${publishCandidate.currentVersion.number}? Published workflow versions cannot be edited.`
          : ""}
        onClose={() => setPublishCandidate(undefined)}
        onConfirm={() => {
          if (!publishCandidate) return;
          publishTemplate.mutate(publishCandidate.id, {
            onError: showPublicationError,
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
        message={deleteCandidate
          ? `Delete ${deleteCandidate.name}? This cannot be undone.`
          : ""}
        onClose={() => setDeleteCandidate(undefined)}
        onConfirm={() => {
          if (!deleteCandidate) return;
          deleteTemplate.mutate(deleteCandidate, {
            onSuccess: () => setDeleteCandidate(undefined),
          });
        }}
        pendingLabel="Deleting…"
        title="Delete workflow template"
      />
    </div>
  );
}
