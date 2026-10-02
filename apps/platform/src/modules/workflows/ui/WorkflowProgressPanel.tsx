"use client";

import { Check, Circle, Clock3 } from "lucide-react";
import { useState } from "react";

import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type {
  WorkflowProgressStage,
  WorkflowProgressView,
} from "../api/WorkflowProgressTypes";
import { WorkflowFlowToolbar } from "./WorkflowFlowToolbar";
import { WorkflowVisualGraph } from "./definitions/WorkflowVisualGraph";
import { WorkflowStageTaskAssignments } from "./WorkflowStageTaskAssignments";

const statusLabels: Record<WorkflowProgressStage["status"], string> = {
  ACTIVE: "In progress",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NOT_STARTED: "Waiting",
};

const statusBorders: Record<WorkflowProgressStage["status"], string> = {
  ACTIVE: "border-brand-blue",
  BLOCKED: "border-brand-orange",
  CANCELLED: "border-brand-navy/30",
  COMPLETED: "border-brand-green",
  NOT_STARTED: "border-slate-400",
};

const statusTextColors: Record<WorkflowProgressStage["status"], string> = {
  ACTIVE: "text-brand-blue",
  BLOCKED: "text-brand-navy/60",
  CANCELLED: "text-brand-navy/60",
  COMPLETED: "text-brand-green",
  NOT_STARTED: "text-slate-500",
};

function stageKey(stage: WorkflowProgressStage) {
  return stage.id ?? `planned-${stage.sequence}`;
}

function StageMarker({ status }: { status: WorkflowProgressStage["status"] }) {
  if (status === "COMPLETED") {
    return <Check aria-hidden="true" className="size-4" />;
  }
  if (status === "ACTIVE" || status === "BLOCKED") {
    return <Clock3 aria-hidden="true" className="size-4" />;
  }
  return <Circle aria-hidden="true" className="size-4" />;
}

function StageFlow({ progress }: { progress: WorkflowProgressView }) {
  const [showVisualFlow, setShowVisualFlow] = useState(false);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const defaultStage =
    progress.stages.find(
      (stage) => stage.status === "ACTIVE" || stage.status === "BLOCKED",
    ) ?? progress.stages[0];
  const [selectedKey, setSelectedKey] = useState(
    defaultStage ? stageKey(defaultStage) : "",
  );
  const selected =
    progress.stages.find((stage) => stageKey(stage) === selectedKey) ??
    defaultStage;
  if (!selected) return null;

  const graphStages = progress.graph?.stages ?? [];
  const latestRuns = new Map<string, WorkflowProgressStage>();
  for (const stage of progress.stages) {
    const previous = latestRuns.get(stage.stableKey);
    if (
      !previous ||
      (stage.iterationNumber ?? 0) > (previous.iterationNumber ?? 0)
    ) {
      latestRuns.set(stage.stableKey, stage);
    }
  }
  const annotations = new Map(
    graphStages.map((stage) => {
      const run = latestRuns.get(stage.stableKey);
      const status = run?.status ?? "NOT_STARTED";
      return [
        stage.stableKey,
        <span
          key={stage.stableKey}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${statusTextColors[status]}`}
        >
          <StageMarker status={status} />
          {statusLabels[status]}
          {run?.iterationNumber && run.iterationNumber > 1
            ? ` · Run ${run.iterationNumber}`
            : ""}
        </span>,
      ];
    }),
  );

  const borders = new Map(
    graphStages.map((stage) => [
      stage.stableKey,
      statusBorders[latestRuns.get(stage.stableKey)?.status ?? "NOT_STARTED"],
    ]),
  );
  const takenPaths = new Set(
    progress.takenPaths.map(
      (path) => `${path.transitionId}:${path.targetStageKey ?? "terminal"}`,
    ),
  );

  return (
    <>
      {progress.graph ? (
        <div className="mt-5 min-w-0 max-w-full overflow-hidden rounded-xl border border-brand-navy/10">
          <WorkflowFlowToolbar
            isExpanded={showVisualFlow}
            onAutoArrange={() => {
              setShowVisualFlow(true);
              setLayoutRevision((revision) => revision + 1);
            }}
            onToggle={() => setShowVisualFlow((value) => !value)}
            stageCount={graphStages.length}
          />
          {showVisualFlow ? (
            <WorkflowVisualGraph
              key={layoutRevision}
              onSelect={(key) => {
                const run = latestRuns.get(key);
                if (run) setSelectedKey(stageKey(run));
              }}
              selectedCode={selected.stableKey}
              stageAnnotations={annotations}
              stageBorderClasses={borders}
              routeTaken={(route, destinationKey) => {
                if (!route.id) return false;
                if (destinationKey) {
                  return takenPaths.has(`${route.id}:${destinationKey}`);
                }
                return route.targetStageKeys.length
                  ? route.targetStageKeys.some((key) =>
                      takenPaths.has(`${route.id}:${key}`),
                    )
                  : takenPaths.has(`${route.id}:terminal`);
              }}
              stages={graphStages}
              transitions={progress.graph.transitions}
              viewportClassName="max-h-[560px]"
              viewportLabel="Workflow instance visual flow"
            />
          ) : null}
        </div>
      ) : null}
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <nav
          aria-label="Workflow stages"
          className="rounded-xl border border-brand-navy/10 p-3"
        >
          <p className="px-2 py-2 text-sm font-semibold text-brand-navy">
            Stages
          </p>
          <ol className="space-y-1">
            {progress.stages.map((stage, index) => {
              const isSelected = stageKey(stage) === stageKey(selected);
              return (
                <li key={stageKey(stage)}>
                  <button
                    aria-current={isSelected ? "step" : undefined}
                    className={
                      isSelected
                        ? "flex w-full items-center gap-3 rounded-lg bg-brand-orange/10 p-3 text-left text-brand-navy ring-1 ring-brand-orange/30"
                        : "flex w-full items-center gap-3 rounded-lg p-3 text-left text-brand-navy hover:bg-brand-navy/5"
                    }
                    onClick={() => setSelectedKey(stageKey(stage))}
                    type="button"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-navy/10 text-xs font-bold">
                      {stage.status === "COMPLETED" ? (
                        <StageMarker status={stage.status} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {stage.name}
                      </span>
                      <span
                        className={`block text-xs ${statusTextColors[stage.status]}`}
                      >
                        {statusLabels[stage.status]}
                        {stage.iterationNumber && stage.iterationNumber > 1
                          ? ` · Run ${stage.iterationNumber}`
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <SelectedStageDetails selected={selected} />
      </div>
    </>
  );
}

function SelectedStageDetails({
  selected,
}: {
  selected: WorkflowProgressStage;
}) {
  return (
    <section
      aria-label="Selected stage details"
      className="min-w-0 rounded-xl border border-brand-navy/10 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/50">
            Stage {selected.sequence}
            {selected.iterationNumber && selected.iterationNumber > 1
              ? ` · Run ${selected.iterationNumber}`
              : ""}
          </p>
          <h3 className="mt-1 text-xl font-bold text-brand-navy">
            {selected.name}
          </h3>
        </div>
        <span
          className={`rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold ${statusTextColors[selected.status]}`}
        >
          {statusLabels[selected.status]}
        </span>
      </div>
      {selected.description ? (
        <p className="mt-4 text-sm text-brand-navy/70">
          {selected.description}
        </p>
      ) : null}
      <dl className="mt-5 grid gap-3 border-t border-brand-navy/10 pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-brand-navy/55">Activated</dt>
          <dd className="mt-1 font-semibold text-brand-navy">
            {selected.activatedAt
              ? formatLocalDateTime24(selected.activatedAt)
              : "Not yet activated"}
          </dd>
        </div>
        <div>
          <dt className="text-brand-navy/55">Completed</dt>
          <dd className="mt-1 font-semibold text-brand-navy">
            {selected.completedAt
              ? formatLocalDateTime24(selected.completedAt)
              : "Not yet completed"}
          </dd>
        </div>
      </dl>
      <WorkflowStageTaskAssignments tasks={selected.tasks} />
    </section>
  );
}

export function WorkflowProgressPanel({
  progress,
}: {
  progress: WorkflowProgressView | null;
}) {
  if (!progress) {
    return (
      <section className="min-w-0 w-full max-w-full rounded-xl border border-brand-navy/10 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-bold text-brand-navy">Workflow Progress</h2>
        <p className="mt-2 text-sm text-brand-navy/65">
          No workflow instance is available for this application yet.
        </p>
      </section>
    );
  }

  const completed = progress.stages.filter(
    (stage) => stage.status === "COMPLETED",
  ).length;
  const active = progress.stages.filter(
    (stage) => stage.status === "ACTIVE" || stage.status === "BLOCKED",
  ).length;

  return (
    <section className="min-w-0 w-full max-w-full rounded-xl border border-brand-navy/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-navy">{progress.name}</h2>
          <p className="mt-1 text-sm text-brand-navy/60">
            Workflow version {progress.versionNumber} · Started{" "}
            {formatLocalDateTime24(progress.startedAt)}
          </p>
        </div>
        <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-navy">
          {progress.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-4 text-sm text-brand-navy/70">
        {completed} completed · {active} active · {progress.stages.length}{" "}
        stages shown
      </p>
      <StageFlow progress={progress} />
    </section>
  );
}
