"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { useWorkflowTemplates } from "../../WorkflowHooks";
import { WorkflowTemplateCreateForm } from "./WorkflowTemplateCreateForm";
import { WorkflowTemplateTable } from "./WorkflowTemplateTable";

type Props = {
  canCreate: boolean;
};

export function WorkflowTemplateAdminWorkspace({ canCreate }: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const templates = useWorkflowTemplates();
  const emptyMessage = templates.isLoading
    ? "Loading workflow templates…"
    : (templates.error?.message ??
      "No workflow templates yet. Create a template to begin.");

  return (
    <div className="space-y-4">
      {canCreate ? (
        <div className="flex justify-end">
          <GeneralButton onClick={() => setIsCreateOpen(true)} size="sm">
            <Plus className="size-4" />
            Create template
          </GeneralButton>
        </div>
      ) : null}
      <WorkflowTemplateTable
        emptyMessage={emptyMessage}
        items={templates.data ?? []}
      />
      <DraggableDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create workflow template"
      >
        <WorkflowTemplateCreateForm onCreated={() => setIsCreateOpen(false)} />
      </DraggableDialog>
    </div>
  );
}
