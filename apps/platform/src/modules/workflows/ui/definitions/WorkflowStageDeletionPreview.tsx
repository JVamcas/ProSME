"use client";

import { useController, type Control } from "react-hook-form";

import type { WorkflowStageDeletionInspection } from "../../domain/definitions/WorkflowStageDeletion";
import type { WorkflowGraphInput, WorkflowTransitionInput } from "../../domain/definitions/WorkflowTypes";
import type { WorkflowStageDeletionFormValues } from "./WorkflowStageDeletionFormSchema";
import { WorkflowStageDeletionConnections } from "./WorkflowStageDeletionConnections";

type Props = {
  control: Control<WorkflowStageDeletionFormValues>;
  disabled?: boolean;
  graph: WorkflowGraphInput;
  inspection: WorkflowStageDeletionInspection;
};

export function WorkflowStageDeletionPreview({
  control,
  disabled,
  graph,
  inspection,
}: Props) {
  const { field } = useController({ control, name: "reconnections" });
  const reconnections = field.value;
  const suggestions = inspection.incomingRoutes.flatMap((route) =>
    route.successorStages.map((successor) => {
      const selected = reconnections?.find(
        (item) => item.transitionIndex === route.transitionIndex,
      )?.targetStageKeys.includes(successor.stableKey) ?? false;
      return {
        ...route.transition,
        id: `preview-${route.transitionIndex}-${successor.stableKey}`,
        targetStageKeys: [successor.stableKey],
        terminalOutcome: null,
        selected,
        transitionIndex: route.transitionIndex,
      };
    }),
  );
  const selectedIds = new Set(
    suggestions.filter((transition) => transition.selected).map((transition) => transition.id),
  );

  function toggleRoute(transition: WorkflowTransitionInput) {
    if (disabled) return;
    const suggestion = suggestions.find((item) => item.id === transition.id);
    if (!suggestion) return;
    const route = inspection.incomingRoutes.find(
      (item) => item.transitionIndex === suggestion.transitionIndex,
    );
    if (!route) return;
    const targetKey = suggestion.targetStageKeys[0];
    const nextReconnections = reconnections.map((item) => {
      if (item.transitionIndex !== suggestion.transitionIndex) return item;
      const selected = item.targetStageKeys.includes(targetKey);
      let targetStageKeys: string[];
      if (selected) {
        targetStageKeys = item.targetStageKeys.filter((key) => key !== targetKey);
      } else if (route.singleTarget) {
        targetStageKeys = [targetKey];
      } else {
        targetStageKeys = [...item.targetStageKeys, targetKey];
      }
      return { ...item, targetStageKeys };
    });
    field.onChange(nextReconnections);
    field.onBlur();
  }

  return (
    <section
      aria-label="Stage deletion preview"
      className="min-w-0 space-y-4"
    >
      <WorkflowStageDeletionConnections
        disabled={disabled}
        onToggleRoute={toggleRoute}
        graph={graph}
        inspection={inspection}
        replacements={suggestions}
        selectedIds={selectedIds}
      />
      {!suggestions.length ? (
        <p className="text-sm text-brand-navy/65">
          No eligible replacement paths are available.
        </p>
      ) : null}
    </section>
  );
}
