"use client";

import { Workflow } from "lucide-react";
import { useState } from "react";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { CloneButton, PublishButton } from "@/components/ui/action-buttons";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  useCloneWorkflow,
  useWorkflowEditor,
  useWorkflowListLifecycle,
} from "@/modules/workflows/WorkflowHooks";
import { workflowTemplatePublishableStatuses } from "@/modules/workflows/domain/definitions/WorkflowTemplate";
import { PageShell } from "@/shared/ui/PageShell";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import { showWorkflowPublicationError } from "@/modules/workflows/ui/definitions/WorkflowPublicationErrorToast";
import { WorkflowDefinitionDetailsCard } from "./WorkflowDefinitionDetailsCard";
import { WorkflowStageFlow } from "@/modules/workflows/ui/definitions/WorkflowStageFlow";

type Props = {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  definitionId: string;
};
export function WorkflowEditorWorkspace({
  canPublish,
  canUpdate,
  definitionId,
}: Props) {
  const query = useWorkflowEditor(definitionId);
  const clone = useCloneWorkflow(definitionId);
  const publish = useWorkflowListLifecycle("publish", definitionId);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);

  if (query.isLoading)
    return (
      <PortalLoadingState title="" description={"Loading workflow editor…"} />
    );

  if (query.error || !query.data)
    return (
      <PortalErrorState
        title={query.error?.name}
        description={query.error?.message ?? "Workflow could not be loaded."}
      />
    );

  const editor = query.data;
  const busy = clone.isPending || publish.isPending;
  const canPublishVersion = canPublish
    && workflowTemplatePublishableStatuses.includes(editor.version.status);

  return (
    <>
      <PageShell
        actions={
          <div className="flex flex-wrap gap-2">
            <CloneButton
              title={`Clone ${editor.definition.name} to a new version.`}
              disabled={busy || !canUpdate}
              onClick={() => clone.mutate(editor.version.id)}
            />
            {canPublishVersion ? (
              <PublishButton
                disabled={busy}
                onClick={() => {
                  publish.reset();
                  setShowPublishConfirmation(true);
                }}
                title={`Publish ${editor.definition.name}`}
              />
            ) : null}
            <StatusBadge status={editor.version.status} />
          </div>
        }
        description={editor.definition.description}
        eyebrow="Admin / Workflow Templates"
        icon={<Workflow size={18} className="text-brand-orange" />}
        title="Workflow Editor"
      >
        <div className="space-y-6">
          <WorkflowDefinitionDetailsCard editor={editor} />
          <WorkflowStageFlow
            canEdit={canUpdate && editor.version.status === "DRAFT"}
            editor={editor}
          />
        </div>
      </PageShell>
      <ConfirmationDialog
        confirmLabel="Publish"
        isOpen={showPublishConfirmation}
        isPending={publish.isPending}
        message={`Publish ${editor.definition.name} version ${editor.version.number}? Published workflow versions cannot be edited.`}
        onClose={() => setShowPublishConfirmation(false)}
        onConfirm={() => publish.mutate(definitionId, {
          onError: showWorkflowPublicationError,
          onSuccess: () => setShowPublishConfirmation(false),
        })}
        pendingLabel="Publishing…"
        title="Publish workflow template"
      />
    </>
  );
}
