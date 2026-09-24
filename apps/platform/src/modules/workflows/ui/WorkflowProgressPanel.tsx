"use client";

import { Check, Circle, Clock3 } from "lucide-react";
import { useState } from "react";

import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkflowProgressStage, WorkflowProgressView } from "../api/WorkflowProgressTypes";

const statusLabels: Record<WorkflowProgressStage["status"], string> = {
  ACTIVE: "In progress",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NOT_STARTED: "Waiting",
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
  const defaultStage = progress.stages.find(
    (stage) => stage.status === "ACTIVE" || stage.status === "BLOCKED",
  ) ?? progress.stages[0];
  const [selectedKey, setSelectedKey] = useState(
    defaultStage ? stageKey(defaultStage) : "",
  );
  const selected = progress.stages.find(
    (stage) => stageKey(stage) === selectedKey,
  ) ?? defaultStage;
  if (!selected) return null;

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <nav aria-label="Workflow stages" className="rounded-xl border border-brand-navy/10 p-3">
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
                  className={isSelected
                    ? "flex w-full items-center gap-3 rounded-lg bg-brand-orange/10 p-3 text-left text-brand-navy ring-1 ring-brand-orange/30"
                    : "flex w-full items-center gap-3 rounded-lg p-3 text-left text-brand-navy hover:bg-brand-navy/5"}
                  onClick={() => setSelectedKey(stageKey(stage))}
                  type="button"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-navy/10 text-xs font-bold">
                    {stage.status === "COMPLETED" ? <StageMarker status={stage.status} /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{stage.name}</span>
                    <span className="block text-xs text-brand-navy/60">
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
      <section aria-label="Selected stage details" className="rounded-xl border border-brand-navy/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/50">
              Stage {selected.sequence}
              {selected.iterationNumber && selected.iterationNumber > 1
                ? ` · Run ${selected.iterationNumber}`
                : ""}
            </p>
            <h3 className="mt-1 text-xl font-bold text-brand-navy">{selected.name}</h3>
          </div>
          <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-navy">
            {statusLabels[selected.status]}
          </span>
        </div>
        {selected.description ? (
          <p className="mt-4 text-sm text-brand-navy/70">{selected.description}</p>
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
        {selected.tasks.length > 0 ? (
          <div className="mt-6 border-t border-brand-navy/10 pt-4">
            <h4 className="text-sm font-semibold text-brand-navy">
              Stage tasks ({selected.tasks.length})
            </h4>
            <ul className="mt-3 space-y-2">
              {selected.tasks.map((task) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-navy/5 px-3 py-2 text-sm"
                  key={task.id}
                >
                  <span className="font-medium text-brand-navy">{task.name}</span>
                  <span className="text-xs font-semibold text-brand-navy/65">
                    {task.status.replaceAll("_", " ")}
                    {task.dueAt ? ` · Due ${formatLocalDateTime24(task.dueAt)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function WorkflowProgressPanel({
  progress,
}: {
  progress: WorkflowProgressView | null;
}) {
  if (!progress) {
    return (
      <section className="rounded-xl border border-brand-navy/10 bg-white p-6">
        <h2 className="text-lg font-bold text-brand-navy">Workflow Progress</h2>
        <p className="mt-2 text-sm text-brand-navy/65">
          No workflow instance is available for this application yet.
        </p>
      </section>
    );
  }

  const completed = progress.stages.filter((stage) => stage.status === "COMPLETED").length;
  const active = progress.stages.filter(
    (stage) => stage.status === "ACTIVE" || stage.status === "BLOCKED",
  ).length;

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-brand-navy">{progress.name}</h2>
          <p className="mt-1 text-sm text-brand-navy/60">
            Workflow version {progress.versionNumber} · Started {formatLocalDateTime24(progress.startedAt)}
          </p>
        </div>
        <span className="rounded-full bg-brand-orange/10 px-3 py-1 text-xs font-semibold text-brand-navy">
          {progress.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-4 text-sm text-brand-navy/70">
        {completed} completed · {active} active · {progress.stages.length} stages shown
      </p>
      <StageFlow progress={progress} />
    </section>
  );
}
