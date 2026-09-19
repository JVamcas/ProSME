"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import {
  useCloneWorkflowTemplate,
  useDeleteWorkflowTemplate,
  useWorkflowTemplates,
} from "../../WorkflowHooks";
import type { WorkflowTemplateListItem } from "../../domain/definitions/WorkflowTemplate";
import { WorkflowTemplateCreateForm } from "./WorkflowTemplateCreateForm";
import { WorkflowTemplateTable } from "./WorkflowTemplateTable";

type Props = {
  canCreate: boolean;
  canUpdate: boolean;
};

export function WorkflowTemplateAdminWorkspace({ canCreate, canUpdate }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplateListItem>();
  const [deleteCandidate, setDeleteCandidate] =
    useState<WorkflowTemplateListItem>();
  const templates = useWorkflowTemplates();
  const cloneTemplate = useCloneWorkflowTemplate();
  const deleteTemplate = useDeleteWorkflowTemplate();
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
        title="Delete workflow template"
      />
    </div>
  );
}
