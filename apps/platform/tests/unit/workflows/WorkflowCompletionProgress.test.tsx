import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { buildWorkflowCompletionProgress } from "@/modules/workflows/engine/WorkflowCompletionProgress";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { operator } from "@/modules/conditions/domain/Operator";
import { WorkflowStageCompletionRequirements } from "@/modules/workflows/ui/runtime/WorkflowStageCompletionRequirements";
import { workflowProgressFixture } from "../../support/WorkflowProgressFixture";

const context = {
  application: { score: 64 },
  eligibility: {},
  fundingCall: {},
  stages: [],
};
const condition = {
  id: "score",
  kind: "CONDITION" as const,
  leftOperand: { kind: "FIELD" as const, key: "application.score" },
  operator: basicOperators.GREATER_THAN_OR_EQUAL,
  rightOperand: { kind: "CONSTANT" as const, value: 70 },
};
const group = {
  id: "exit",
  kind: "GROUP" as const,
  combinator: "AND" as const,
  children: [condition],
};
const input = {
  requirements: [],
  tasks: [],
  exitCondition: group,
  context,
  hideValues: false,
};

describe("stage completion requirement progress", () => {
  it("distinguishes evaluation errors from failed comparisons throughout nested groups", () => {
    const result = buildWorkflowCompletionProgress({
      ...input,
      exitCondition: {
        ...group,
        children: [
          {
            ...group,
            id: "nested",
            children: [{ ...condition, operator: operator("UNKNOWN") }],
          },
        ],
      },
    });
    expect(result.satisfied).toBe(false);
    expect(result.requirements[0].state).toBe("UNAVAILABLE");
    expect(result.requirements[0].children?.[0].state).toBe("UNAVAILABLE");
  });

  it("uses rounded percentage thresholds and distinguishes pending decisions", () => {
    const result = buildWorkflowCompletionProgress({
      ...input,
      exitCondition: null,
      requirements: [
        {
          taskDefinitionId: "review",
          taskKey: "APPROVE",
          completedCount: 1,
          completedTaskIds: ["task"],
          denominator: 3,
          completionMode: "PERCENT",
          completionPercentage: 50,
          requiredCompletionCount: 1,
        },
      ],
      tasks: [
        {
          taskDefinitionId: "review",
          name: "Approve",
          taskType: "STAGE_DECISION",
        },
      ],
    });
    expect(result.satisfied).toBe(false);
    expect(result.requirements[0]).toMatchObject({
      state: "PENDING",
      label: "Approve",
    });
    expect(result.requirements[0].detail).toContain("1 of 2");
    expect(result.requirements[0].detail).toContain("Awaiting decision");
  });

  it("preserves ANY groups without counting their unmet alternatives as blockers", () => {
    const result = buildWorkflowCompletionProgress({
      ...input,
      exitCondition: {
        ...group,
        combinator: "OR",
        children: [
          condition,
          {
            ...condition,
            id: "alternative",
            rightOperand: { kind: "CONSTANT", value: 60 },
          },
        ],
      },
    });
    expect(result.satisfied).toBe(true);
    expect(result.requirements[0]).toMatchObject({
      state: "MET",
      combinator: "OR",
    });
    expect(result.requirements[0].children?.map((item) => item.state)).toEqual([
      "NOT_MET",
      "MET",
    ]);
  });

  it("reports missing decision data as pending while keeping other child results", () => {
    const result = buildWorkflowCompletionProgress({
      ...input,
      exitCondition: {
        ...group,
        children: [
          condition,
          {
            ...condition,
            id: "decision",
            leftOperand: {
              kind: "FIELD",
              key: "stage.finance_review.actions.approve.selected",
            },
          },
        ],
      },
    });
    expect(result.satisfied).toBe(false);
    expect(result.requirements[0].state).toBe("PENDING");
    expect(result.requirements[0].children?.map((item) => item.state)).toEqual([
      "NOT_MET",
      "PENDING",
    ]);
  });

  it("shows comparisons and removes unreleased values from the response", () => {
    const result = buildWorkflowCompletionProgress(input);
    expect(result.requirements[0].children?.[0].detail).toBe(
      "Current: 64 · Compared with: 70",
    );
    const hidden = buildWorkflowCompletionProgress({
      ...input,
      hideValues: true,
    });
    expect(JSON.stringify(hidden)).not.toContain("64");
    expect(hidden.requirements[0].children?.[0].detail).toContain("hidden");
  });

  it("renders outstanding requirements first and collapses satisfied requirements", () => {
    const completion = buildWorkflowCompletionProgress({
      ...input,
      exitCondition: {
        ...group,
        children: [
          condition,
          {
            ...condition,
            id: "met",
            rightOperand: { kind: "CONSTANT", value: 60 },
          },
        ],
      },
    });
    const markup = renderToStaticMarkup(
      <WorkflowStageCompletionRequirements
        stage={{
          ...workflowProgressFixture.stages[0],
          completionRequirements: completion,
        }}
      />,
    );
    expect(markup).toContain("1 outstanding");
    expect(markup).toContain("All of these must be met");
    expect(markup).toContain("Current: 64");
    expect(markup).toContain("Not met");
    const met = renderToStaticMarkup(
      <WorkflowStageCompletionRequirements
        stage={{
          ...workflowProgressFixture.stages[0],
          completionRequirements: {
            satisfied: true,
            requirements: [
              { id: "met", label: "Review", state: "MET", detail: "Done" },
            ],
          },
        }}
      />,
    );
    expect(met).toContain("<details");
    expect(met).toContain("Satisfied requirements (1)");
    expect(met).not.toContain("<details open");
  });
});
