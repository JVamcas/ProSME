"use client";

import { Copy } from "lucide-react";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  useCloneWorkflow,
  useWorkflowEditor,
} from "@/modules/workflows/WorkflowHooks";
import { PageShell } from "@/shared/ui/PageShell";
import { WorkflowDefinitionDetailsCard } from "./WorkflowDefinitionDetailsCard";
import { WorkflowStageFlow } from "./WorkflowStageFlow";

type Props = {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  definitionId: string;
};
export function WorkflowEditorWorkspace({ canUpdate, definitionId }: Props) {
  const query = useWorkflowEditor(definitionId);
  const clone = useCloneWorkflow(definitionId);

  if (query.isLoading)
    return (
      <PortalLoadingState title="" description={"Loading workflow editor…"} />
    );

  if (query.error || !query.data)
    return (
      <PortalErrorState
        title="Error"
        description={query.error?.message ?? "Workflow could not be loaded."}
      />
    );

  const editor = query.data;
  const busy = clone.isPending;

  return (
    <PageShell
        title="Workflow definitions"
        description={editor.definition.description}
        icon={<StatusBadge status={editor.version.status} />}
        actions={
          <div className="flex flex-wrap gap-2">
            {editor.version.status !== "DRAFT" && canUpdate ? (
              <GeneralButton
                variant="outline"
                disabled={busy}
                onClick={() => clone.mutate(editor.version.id)}
              >
                <Copy className="size-4" />
                Clone
              </GeneralButton>
            ) : null}
          </div>
        }
    >
      <div className="space-y-6">
        <WorkflowDefinitionDetailsCard editor={editor} />
        <WorkflowStageFlow canEdit={canUpdate} editor={editor} />
      </div>
    </PageShell>
  );
}
