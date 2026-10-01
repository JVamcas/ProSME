import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { workflowStageAttention } from "@/modules/workflows/ui/definitions/WorkflowStageAttention";
import { WorkflowStageList } from "@/modules/workflows/ui/definitions/WorkflowStageList";
import { WorkflowVisualGraph } from "@/modules/workflows/ui/definitions/WorkflowVisualGraph";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

const graph = referenceWorkflow;
const [healthy, affected] = graph.stages;
const validation = {
  valid: false,
  errors: [
    { code: "UNREACHABLE_STAGE", path: "stages.1", message: "Stage is unreachable." },
    { code: "TASK_CONFIG", path: "stages.1.tasks.0", message: "Fix task configuration." },
  ],
  warnings: [],
};

describe("workflow stage attention", () => {
  it("uses graph identity when the display order differs and combines issue details", () => {
    const attention = workflowStageAttention(graph, validation);
    expect(attention.has(healthy.stableKey)).toBe(false);
    expect(attention.get(affected.stableKey)).toEqual({
      label: "Unreachable",
      messages: ["Stage is unreachable.", "Fix task configuration."],
    });
    const markup = renderToStaticMarkup(
      <WorkflowStageList
        attentionByStage={attention}
        onSelect={() => {}}
        selectedCode={affected.stableKey}
        stages={[affected, healthy]}
      />,
    );
    const rows = [...markup.matchAll(/<button[\s\S]*?<\/button>/g)];
    expect(rows[0][0]).toContain("bg-red-50");
    expect(rows[0][0]).toContain("ring-red-600");
    expect(rows[0][0]).toContain('aria-pressed="true"');
    expect(rows[0][0]).toContain("Unreachable");
    expect(rows[0][0]).toContain("Fix task configuration.");
    expect(rows[1][0]).not.toContain("bg-red-50");
  });

  it("maps transition issues to the source and referenced target and includes warnings", () => {
    const transition = graph.transitions[0];
    const attention = workflowStageAttention(graph, {
      valid: false,
      errors: [{
        code: "NON_REPEATABLE_SEMANTIC_TARGET",
        path: "transitions.0.targetStageKeys.0",
        message: "Target must be repeatable.",
      }],
      warnings: [{ code: "WARNING", path: "stages.1.name", message: "Check name." }],
    });
    expect(attention.get(transition.sourceStageKey)?.label).toBe("Needs attention");
    expect(attention.get(transition.targetStageKeys[0])?.messages).toContain(
      "Target must be repeatable.",
    );
    expect(attention.get(affected.stableKey)?.messages).toContain("Check name.");
  });

  it("highlights affected visual nodes even while selected", () => {
    const markup = renderToStaticMarkup(
      <WorkflowVisualGraph
        attentionByStage={workflowStageAttention(graph, validation)}
        onSelect={() => {}}
        selectedCode={affected.stableKey}
        stages={[healthy, affected]}
        transitions={[]}
      />,
    );
    expect(markup).toContain("border-red-500 ring-2 ring-red-600");
    expect(markup).toContain("bg-red-50");
    expect(markup).toContain("Unreachable");
  });

  it("removes attention after issues are resolved and ignores unscoped issues", () => {
    expect(workflowStageAttention(graph, {
      valid: true,
      errors: [],
      warnings: [],
    }).size).toBe(0);
    expect(workflowStageAttention(graph, {
      valid: false,
      errors: [{ code: "TERMINAL_OUTCOME", path: "transitions", message: "Add an outcome." }],
      warnings: [],
    }).size).toBe(0);
  });
});
