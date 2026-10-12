"use client";

import { useEffect, useState, type ReactNode } from "react";
import { GeneralButton } from "@/shared/ui/Button";
import { SortableStepProgress } from "@/shared/ui/SortableStepProgress";
import { StepProgress } from "@/shared/ui/StepProgress";
import type { WorkflowTaskSectionId } from "../domain/definitions/WorkflowTaskSectionOrder";
import type { TaskWorkSection } from "./WorkflowTaskWorkSections";

export function WorkflowTaskStepLayout({
  disabled,
  finalActions,
  onFinalStepChange,
  onSectionOrderChange,
  orderingPending,
  sections,
}: {
  disabled: boolean;
  finalActions?: ReactNode;
  onFinalStepChange?: (final: boolean) => void;
  sections: TaskWorkSection[];
  onSectionOrderChange?: (ids: WorkflowTaskSectionId[]) => void;
  orderingPending?: boolean;
}) {
  const firstIncomplete = sections.find(
    (section) => section.status !== "Completed",
  );
  const [selectedId, setSelectedId] = useState<WorkflowTaskSectionId>(
    firstIncomplete?.id ?? sections[0].id,
  );
  const current =
    sections.find((section) => section.id === selectedId) ?? sections[0];
  const currentIndex = sections.indexOf(current);
  useEffect(() => {
    onFinalStepChange?.(currentIndex === sections.length - 1);
  }, [currentIndex, sections.length, onFinalStepChange]);
  const completedIds = sections
    .filter((section) => section.status === "Completed")
    .map((section) => section.id);

  const progressProps = {
    ariaLabel: "Task progress",
    completedStepIds: completedIds,
    currentStepId: current.id,
    onStepChange: setSelectedId,
    steps: sections.map((section) => ({ id: section.id, label: section.title })),
  };

  return (
    <div className="space-y-5">
      {onSectionOrderChange ? (
        <SortableStepProgress
          {...progressProps}
          disabled={orderingPending}
          onOrderChange={onSectionOrderChange}
        />
      ) : (
        <StepProgress {...progressProps} />
      )}
      <section className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-brand-white">
        <header className="flex items-center justify-between gap-4 border-b border-brand-navy/10 p-5">
          <h3 className="font-bold text-brand-navy">{current.title}</h3>
          <span className="text-sm text-brand-navy/60">{current.status}</span>
        </header>
        <fieldset className="p-5" disabled={disabled}>
          {sections.map((section) => (
            <div
              className={section.id === current.id ? undefined : "hidden"}
              key={section.id}
            >
              {section.content}
            </div>
          ))}
        </fieldset>
      </section>
      {sections.length > 1 ? (
        <div className="flex justify-between">
          <GeneralButton
            disabled={currentIndex === 0}
            onClick={() => setSelectedId(sections[currentIndex - 1].id)}
            type="button"
            variant="outline"
          >
            Back
          </GeneralButton>
          {currentIndex < sections.length - 1 ? (
            <GeneralButton
              onClick={() => setSelectedId(sections[currentIndex + 1].id)}
              type="button"
            >
              Next
            </GeneralButton>
          ) : null}
        </div>
      ) : null}
      {currentIndex === sections.length - 1 ? finalActions : null}
    </div>
  );
}

