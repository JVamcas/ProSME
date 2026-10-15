"use client";

import { Check, Download, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneralButton } from "@/shared/ui/Button";
import type { WorkflowProgressStage } from "../../api/WorkflowProgressTypes";
import {
  workflowProgressStatusBackgrounds,
  workflowProgressStatusTextColors as statusTextColors,
  workflowProgressStageStatusLabel,
} from "../WorkflowProgressPresentation";
import type { WorkflowStageFunnelControls } from "./WorkflowStageFunnelControls";
import styles from "./WorkflowStageFunnel.module.css";

export function WorkflowStageNavigation({
  stages,
  selectedStageKey,
  onSelect,
  funnel,
}: {
  stages: WorkflowProgressStage[];
  selectedStageKey: string;
  onSelect: (stage: WorkflowProgressStage) => void;
  funnel?: WorkflowStageFunnelControls;
}) {
  const rows = funnel?.summary
    ? funnel.summary.stages.map((item) => ({
        ...item,
        stage: stages.find((stage) => stage.stableKey === item.stageKey),
      }))
    : stages.map((stage) => ({
        stageKey: stage.stableKey,
        name: stage.name,
        count: undefined,
        stage,
      }));

  return (
    <nav
      aria-label="Workflow stages"
      className="min-w-0 rounded-xl border border-brand-navy/10 p-3"
    >
      <div
        className={cn(
          "mb-3 grid gap-3 px-2 py-2 text-sm font-semibold text-brand-navy",
          funnel && "grid-cols-[100px_minmax(0,1fr)]",
        )}
      >
        {funnel ? <span>Applications reached</span> : null}
        <span>Stages</span>
      </div>
      <ol className={funnel ? "pt-2" : "space-y-1"}>
        {rows.map((row, index) => {
          const stage = row.stage;
          const isSelected =
            row.stageKey === (funnel?.selectedStageKey ?? selectedStageKey);
          const exporting = funnel?.exportingStageKey === row.stageKey;
          return (
            <li
              key={row.stageKey}
              className={cn(
                funnel && "grid grid-cols-[100px_minmax(0,1fr)] gap-3",
                funnel &&
                  isSelected &&
                  "rounded-lg ring-2 ring-brand-orange/60",
              )}
            >
              {funnel ? (
                <div
                  className={cn(
                    styles.pipeSegment,
                    index === 0 && styles.first,
                    index === rows.length - 1 && styles.last,
                  )}
                >
                  <GeneralButton
                    aria-label={`View ${row.count ?? ""} applications at ${row.name}`}
                    className="min-w-10 rounded-md px-1 py-2 text-lg font-bold text-white hover:bg-white/10 focus-visible:ring-white"
                    disabled={
                      !funnel.canInspect ||
                      row.count === undefined ||
                      funnel.isLoading ||
                      Boolean(funnel.error)
                    }
                    onClick={() => {
                      if (stage) onSelect(stage);
                      funnel.onInspect(row.stageKey);
                    }}
                    size={null}
                    variant={null}
                  >
                    {row.count === undefined
                      ? funnel.isLoading
                        ? "…"
                        : "—"
                      : row.count.toLocaleString()}
                  </GeneralButton>
                  {funnel.canExport ? (
                    <GeneralButton
                      aria-label={`Download applications at ${row.name}`}
                      className="rounded-md p-1.5 text-white hover:bg-white/10 focus-visible:ring-white"
                      disabled={
                        Boolean(funnel.exportingStageKey) ||
                        !row.count ||
                        Boolean(funnel.error)
                      }
                      onClick={() => funnel.onExport(row.stageKey)}
                      size={null}
                      variant={null}
                    >
                      {exporting ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                      ) : (
                        <Download aria-hidden="true" className="size-4" />
                      )}
                    </GeneralButton>
                  ) : null}
                </div>
              ) : null}
              <GeneralButton
                aria-current={isSelected ? "step" : undefined}
                className={cn(
                  "flex w-full items-center justify-start gap-3 rounded-lg p-3 text-left text-brand-navy transition-colors",
                  stage
                    ? workflowProgressStatusBackgrounds[stage.status]
                    : "bg-slate-50 hover:bg-slate-100",
                  !funnel && isSelected && "ring-2 ring-brand-orange/60",
                )}
                onClick={() => {
                  if (stage) {
                    funnel?.onSelectDetails();
                    onSelect(stage);
                  } else {
                    funnel?.onInspect(row.stageKey);
                  }
                }}
                disabled={!stage && !funnel?.canInspect}
                size={null}
                variant={null}
              >
                {stage ? (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-navy/10 text-xs font-bold">
                    {stage.status === "COMPLETED" ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : (
                      stage.sequence
                    )}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {stage?.name ?? row.name}
                  </span>
                  <span
                    className={cn(
                      "block text-xs font-normal",
                      stage ? statusTextColors[stage.status] : "text-slate-500",
                    )}
                  >
                    {stage
                      ? workflowProgressStageStatusLabel(stage)
                      : "Another workflow version"}
                    {stage?.iterationNumber && stage.iterationNumber > 1
                      ? ` · Run ${stage.iterationNumber}`
                      : ""}
                  </span>
                </span>
              </GeneralButton>
            </li>
          );
        })}
      </ol>
      {funnel ? (
        <p className="mt-4 text-xs text-brand-navy/60">
          This funding call · All workflow versions. One application per stage,
          using its latest run.
        </p>
      ) : null}
      {funnel?.error ? (
        <div className="mt-2 space-y-2">
          <p role="alert" className="text-sm text-red-700">
            {funnel.error}
          </p>
          <GeneralButton
            onClick={funnel.onRetry}
            size="compact"
            variant="outline"
          >
            Retry counts
          </GeneralButton>
        </div>
      ) : null}
    </nav>
  );
}
