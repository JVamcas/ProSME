import type { WorkflowStageDeletionInspection } from "../../domain/definitions/WorkflowStageDeletion";
import type { WorkflowGraphInput, WorkflowTransitionInput } from "../../domain/definitions/WorkflowTypes";
import { WorkflowVisualGraph } from "./WorkflowVisualGraph";
import { workflowStageDeletionRoles } from "./WorkflowStageDeletionColors";

type Props = {
  disabled?: boolean;
  onToggleRoute?: (transition: WorkflowTransitionInput) => void;
  graph: WorkflowGraphInput;
  inspection: WorkflowStageDeletionInspection;
  replacements?: WorkflowTransitionInput[];
  selectedIds?: Set<string>;
};

export function WorkflowStageDeletionConnections({
  disabled,
  onToggleRoute,
  graph,
  inspection,
  replacements = [],
  selectedIds = new Set<string>(),
}: Props) {
  const transitions = graph.transitions.filter(
    (transition) => transition.sourceStageKey === inspection.stage.stableKey
      || transition.targetStageKeys.includes(inspection.stage.stableKey),
  );
  const suggestionIds = new Set(replacements.map((route) => route.id));
  const allTransitions = [...transitions, ...replacements];
  const connectedKeys = new Set([
    inspection.stage.stableKey,
    ...allTransitions.flatMap((transition) => [
      transition.sourceStageKey,
      ...transition.targetStageKeys,
    ]),
  ]);
  const roles = workflowStageDeletionRoles(inspection);
  for (const key of connectedKeys) {
    if (!roles.has(key)) roles.set(key, "both");
  }

  return (
    <section
      aria-label="Stage deletion paths and replacement routes"
      className="min-w-0 overflow-hidden rounded-xl border border-brand-navy/15"
    >
      <div className="space-y-1 bg-brand-cream/40 p-4">
        <h3 className="text-sm font-bold text-red-800">
          Paths that will be deleted ({transitions.length})
        </h3>
        <h3 className="text-sm font-bold text-emerald-900">
          Proposed paths ({selectedIds.size} selected)
        </h3>
        <p className="text-sm text-brand-navy/70">
          Red marks the stage and paths to delete. Blue marks affected stages,
          including other targets of a removed parallel path. Dashed green paths
          are suggestions; solid green paths will be created.
          Click a green path or its label to select it; click again to unselect.
          Each keeps its predecessor action and bypasses the deleted stage.
          No replacement is selected automatically; leaving routes unselected
          may disconnect this draft workflow.
        </p>
      </div>
      <WorkflowVisualGraph
        changeColor="#dc2626"
        onToggleRoute={onToggleRoute}
        routesDisabled={disabled}
        connectionRoles={roles}
        onSelect={() => undefined}
        routeStatus={(transition) => {
          if (!suggestionIds.has(transition.id)) return "deleted";
          return selectedIds.has(transition.id ?? "") ? "created" : "suggested";
        }}
        viewportClassName="max-h-[50dvh]"
        viewportLabel="Stage deletion workflow diagram"
        stages={graph.stages.filter((stage) => connectedKeys.has(stage.stableKey))}
        transitions={allTransitions}
      />
      {!transitions.length ? (
        <p className="p-4 text-sm text-brand-navy/65">
          No paths are connected to this stage.
        </p>
      ) : null}
    </section>
  );
}
