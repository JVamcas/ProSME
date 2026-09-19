"use client";

import { useState } from "react";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import {
  usePublishedWorkflows,
  useWorkflowAssignments,
  useWorkflowDefinitions,
  useWorkflowListLifecycle,
  useWorkflowOpportunities,
} from "@/modules/workflows/WorkflowHooks";
import type { WorkflowDefinitionSummary } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowDefinitionCreateForm } from "./WorkflowDefinitionCreateForm";
import { WorkflowAssignmentDialog } from "./WorkflowAssignmentDialog";
import { WorkflowDefinitionsTable } from "./WorkflowDefinitionsTable";

function WorkflowDetailsDialog({
  canCreate,
  canUpdate,
  isOpen,
  onClose,
  workflow,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  isOpen: boolean;
  onClose: () => void;
  workflow?: WorkflowDefinitionSummary;
}) {
  return (
    <DraggableDialog
      isOpen={isOpen && (workflow ? canUpdate : canCreate)}
      onClose={onClose}
      size="2xl"
      title={workflow ? "Edit workflow" : "Create workflow"}
    >
      <WorkflowDefinitionCreateForm
        onCompleted={onClose}
        workflow={workflow}
      />
    </DraggableDialog>
  );
}

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
  const [assignmentWorkflow, setAssignmentWorkflow] =
    useState<WorkflowDefinitionSummary>();
  const query = useWorkflowDefinitions();
  const assignments = useWorkflowAssignments();
  const opportunities = useWorkflowOpportunities();
  const publishedWorkflows = usePublishedWorkflows();
  const publish = useWorkflowListLifecycle("publish");
  const retire = useWorkflowListLifecycle("retire");
  return (
    <div>
      <WorkflowDefinitionsTable
        assignments={assignments.data ?? []}
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
        onAssign={setAssignmentWorkflow}
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
        opportunities={opportunities.data?.items ?? []}
        publishedWorkflows={publishedWorkflows.data ?? []}
      />
      <WorkflowDetailsDialog
        canCreate={canCreate}
        canUpdate={canUpdate}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        workflow={selectedWorkflow}
      />
      {assignmentWorkflow ? (
        <WorkflowAssignmentDialog
          onClose={() => setAssignmentWorkflow(undefined)}
          workflow={assignmentWorkflow}
        />
      ) : null}
    </div>
  );
}
