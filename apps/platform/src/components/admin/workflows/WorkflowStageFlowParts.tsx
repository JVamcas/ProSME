import { ChevronDown, GitBranch, Plus } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";

export function WorkflowStagesHeader({
  disabled,
  onAddStage,
}: {
  disabled: boolean;
  onAddStage: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-navy/55">
          Approval stages
        </p>
        <h2 className="mt-1 text-2xl font-bold text-brand-navy">
          Build the approval flow
        </h2>
        <p className="mt-2 text-sm text-brand-navy/60">
          Create, reorder, and manage approval stages.
        </p>
      </div>
      <GeneralButton
        disabled={disabled}
        onClick={onAddStage}
        variant="primary"
        type="button"
        size={"compact"}
      >
        <Plus className="size-4 text-white" />
        Add Workflow stage
      </GeneralButton>
    </div>
  );
}

export function WorkflowFlowToolbar({
  isExpanded,
  onAutoArrange,
  onToggle,
  stageCount,
}: {
  isExpanded: boolean;
  onAutoArrange: () => void;
  onToggle: () => void;
  stageCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-white px-5 py-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-navy">
          Visual flow
        </p>
        <p className="mt-1 text-xs text-brand-navy/60">
          Inspect the workflow sequence and its routed paths.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          aria-expanded={isExpanded}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-blue px-3 text-xs font-semibold text-brand-navy"
          onClick={onToggle}
          type="button"
        >
          <ChevronDown
            className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
          {isExpanded ? "Hide" : "Show"} visual flow
        </button>
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-blue px-3 text-xs font-semibold text-brand-navy transition hover:bg-brand-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
          onClick={onAutoArrange}
          type="button"
        >
          <GitBranch className="size-3.5" />
          Auto arrange
        </button>

        <span className="rounded-full border border-brand-navy/15 bg-brand-cream px-3 py-1.5 text-xs font-semibold text-brand-navy/60">
          {stageCount} stages
        </span>
      </div>
    </div>
  );
}
