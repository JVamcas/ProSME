"use client";

import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  useCloneWorkflow,
  useWorkflowEditor,
} from "@/modules/workflows/WorkflowHooks";
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
      <p className="rounded-2xl bg-brand-cream p-6 text-brand-navy">
        Loading workflow editor…
      </p>
    );
  if (query.error || !query.data)
    return (
      <p
        className="rounded-2xl bg-brand-cream p-6 text-brand-navy"
        role="alert"
      >
        {query.error?.message ?? "Workflow could not be loaded."}
      </p>
    );
  const editor = query.data;
  const busy = clone.isPending;
  return (
    <div>
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:text-brand-orange"
        href="/admin/workflows"
      >
        <ArrowLeft className="size-4" /> Workflow definitions
      </Link>
      <header className="mt-4 flex flex-col gap-4 border-b border-brand-navy/15 pb-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-brand-navy">
              {editor.definition.name}
            </h1>
            <StatusBadge status={editor.version.status} />
          </div>
          <p className="mt-2 text-sm text-brand-navy/60">
            {editor.definition.description ||
              "Workflow definition for funding opportunities."}
          </p>
        </div>
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
      </header>
      <WorkflowDefinitionDetailsCard editor={editor} />
      <div className="mt-6 space-y-6">
        <WorkflowStageFlow
          canEdit={canUpdate}
          editor={editor}
        />
      </div>
    </div>
  );
}
