import { ArrowDown, ArrowUp, ChevronDown, GitBranch, Plus } from "lucide-react";

import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { GeneralButton } from "@/components/ui/button";

type StageSelectionProps = {
  selectedCode?: string;
  stages: WorkflowStageInput[];
  onSelect: (code: string) => void;
};

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

export function WorkflowStageList({
  onSelect,
  selectedCode,
  stages,
}: StageSelectionProps) {
  return (
    <aside className="flex min-h-[420px] flex-col rounded-2xl border border-brand-navy/15 bg-brand-white p-3">
      <div className="flex items-start justify-between px-2 py-2">
        <div>
          <h3 className="font-bold text-brand-navy">Stage details</h3>
          <p className="mt-1 text-xs text-brand-navy/55">
            Select a stage to inspect it
          </p>
        </div>
        <span className="text-xs font-bold text-brand-navy/35">
          {stages.length}
        </span>
      </div>
      <div className="mt-2 flex-1 space-y-1">
        {stages.map((stage, index) => (
          <StageListItem
            index={index}
            isSelected={stage.stableKey === selectedCode}
            key={stage.stableKey}
            onSelect={onSelect}
            stage={stage}
            stageCount={stages.length}
          />
        ))}
      </div>
    </aside>
  );
}

function StageListItem({
  index,
  isSelected,
  onSelect,
  stage,
  stageCount,
}: {
  index: number;
  isSelected: boolean;
  onSelect: (code: string) => void;
  stage: WorkflowStageInput;
  stageCount: number;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left transition ${isSelected ? "bg-brand-blue/20 ring-1 ring-brand-blue" : "hover:bg-slate-50"}`}
      onClick={() => onSelect(stage.stableKey)}
      type="button"
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${isSelected ? "bg-brand-navy text-white" : "bg-brand-cream text-brand-navy/55"}`}
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-brand-navy">
          {stage.name}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-brand-navy/55">
          {stage.tasks.length} task{stage.tasks.length === 1 ? "" : "s"}
        </span>
      </span>
      <span className="flex text-brand-navy/25">
        <ArrowUp className={`size-3 ${index === 0 ? "opacity-30" : ""}`} />
        <ArrowDown
          className={`size-3 ${index === stageCount - 1 ? "opacity-30" : ""}`}
        />
      </span>
    </button>
  );
}
