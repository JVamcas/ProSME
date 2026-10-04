import type { WorkflowStageInput } from "../../domain/definitions/WorkflowTypes";
import { WorkflowStageConnectionBadge } from "./WorkflowStageConnectionBadge";
import {
  workflowStageConnectionColors,
  type WorkflowStageConnectionRole,
} from "./WorkflowStageConnectionColors";

import type { WorkflowStageAttention } from "./WorkflowStageAttention";

type StageSelectionProps = {
  attentionByStage?: Map<string, WorkflowStageAttention>;
  selectedCode?: string;
  stages: WorkflowStageInput[];
  onSelect: (code: string) => void;
  connectionRoles?: Map<string, WorkflowStageConnectionRole>;
};

export function WorkflowStageList({
  attentionByStage,
  connectionRoles,
  onSelect,
  selectedCode,
  stages,
}: StageSelectionProps) {
  return (
    <aside className="flex min-h-105 flex-col rounded-t-2xl border border-brand-navy/15 bg-brand-white p-3">
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
            attention={attentionByStage?.get(stage.stableKey)}
            connectionRole={connectionRoles?.get(stage.stableKey)}
            index={index}
            isSelected={stage.stableKey === selectedCode}
            key={stage.stableKey}
            onSelect={onSelect}
            stage={stage}
          />
        ))}
      </div>
    </aside>
  );
}

function StageListItem({
  attention,
  connectionRole,
  index,
  isSelected,
  onSelect,
  stage,
}: {
  attention?: WorkflowStageAttention;
  connectionRole?: WorkflowStageConnectionRole;
  index: number;
  isSelected: boolean;
  onSelect: (code: string) => void;
  stage: WorkflowStageInput;
}) {
  let rowClass = isSelected
    ? "bg-brand-blue/20 ring-1 ring-brand-blue"
    : "hover:bg-slate-50";
  if (connectionRole) {
    rowClass = workflowStageConnectionColors[connectionRole].row;
  }
  if (attention) {
    rowClass = isSelected
      ? "bg-red-50 ring-2 ring-red-600 hover:bg-red-100"
      : "bg-red-50 ring-1 ring-red-300 hover:bg-red-100";
  }
  let numberClass = isSelected
    ? "bg-brand-navy text-white"
    : "bg-brand-cream text-brand-navy/55";
  if (attention) numberClass = "bg-red-600 text-white";
  const nameClass = attention ? "text-red-900" : "text-brand-navy";

  return (
    <button
      aria-pressed={isSelected}
      className={`flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left transition ${rowClass}`}
      onClick={() => onSelect(stage.stableKey)}
      title={attention?.messages.join("\n")}
      type="button"
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${numberClass}`}
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-xs font-bold ${nameClass}`}>
          {stage.name}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-brand-navy/55">
          {stage.tasks.length} task{stage.tasks.length === 1 ? "" : "s"}
        </span>
        {attention ? (
          <span className="mt-0.5 block text-[10px] font-semibold text-red-700">
            {attention.label}
          </span>
        ) : null}
        {connectionRole ? (
          <WorkflowStageConnectionBadge role={connectionRole} />
        ) : null}
      </span>
    </button>
  );
}
