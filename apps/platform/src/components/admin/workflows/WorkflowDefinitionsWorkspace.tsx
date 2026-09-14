"use client";

import { useState } from "react";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import {
  useWorkflowDefinitions,
  useWorkflowListLifecycle,
} from "@/modules/workflows/WorkflowHooks";
import { WorkflowDefinitionCreateForm } from "./WorkflowDefinitionCreateForm";
import { WorkflowDefinitionsTable } from "./WorkflowDefinitionsTable";
import type { WorkflowDefinitionSummary } from "@/modules/workflows/WorkflowTypes";

export function WorkflowDefinitionsWorkspace({
  canCreate,
  canPublish,
  canRetire,
  canUpdate,
}: {
  canCreate: boolean;
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowDefinitionSummary>();
  const query = useWorkflowDefinitions();
  const publish = useWorkflowListLifecycle("publish");
  const retire = useWorkflowListLifecycle("retire");
  return (
    <div>
      <WorkflowDefinitionsTable
        canCreate={canCreate}
        canPublish={canPublish}
        canRetire={canRetire}
        canUpdate={canUpdate}
        emptyMessage={
          query.isLoading
            ? "Loading workflows…"
            : query.error?.message ??
              "No workflow definitions yet. Create a workflow to begin."
        }
        items={query.data ?? []}
        lifecycleError={publish.error?.message ?? retire.error?.message}
        onActivate={(workflow) => {
          retire.reset();
          publish.mutate(workflow.id);
        }}
        onCreate={() => {
          setSelectedWorkflow(undefined);
          setIsDialogOpen(true);
        }}
        onDeactivate={(workflow) => {
          publish.reset();
          retire.mutate(workflow.id);
        }}
        onEdit={(workflow) => {
          setSelectedWorkflow(workflow);
          setIsDialogOpen(true);
        }}
        pendingAction={
          publish.isPending
            ? { action: "activate", id: publish.variables }
            : retire.isPending
              ? { action: "deactivate", id: retire.variables }
              : undefined
        }
      />
      <DraggableDialog
        isOpen={isDialogOpen && (selectedWorkflow ? canUpdate : canCreate)}
        onClose={() => setIsDialogOpen(false)}
        size="2xl"
        title={selectedWorkflow ? "Edit workflow" : "Create workflow"}
      >
        <WorkflowDefinitionCreateForm
          onCompleted={() => setIsDialogOpen(false)}
          workflow={selectedWorkflow}
        />
      </DraggableDialog>
    </div>
  );
}
