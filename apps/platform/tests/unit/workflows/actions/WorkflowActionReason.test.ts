import { describe, expect, it } from "vitest";

import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import { workflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import {
  validateActionInputAgainstConfiguration,
  workflowActionInputSchema,
} from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { createStandardWorkflowDraft } from "@/modules/workflows/domain/standard/StandardWorkflowCatalogue";
import {
  standardWorkflowRoleCodes,
  standardWorkflowFormCodes,
  type StandardWorkflowDependencies,
} from "@/modules/workflows/domain/standard/StandardWorkflowTypes";

const graph = createStandardWorkflowDraft({
  roleIds: Object.fromEntries(
    standardWorkflowRoleCodes.map((code, index) => [
      code,
      `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    ]),
  ) as StandardWorkflowDependencies["roleIds"],
  formVersionIds: Object.fromEntries(
    standardWorkflowFormCodes.map((code, index) => [
      code,
      `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    ]),
  ),
}).graph;

// Use real configurations for every supported action, including action-specific
// required inputs, so this covers the universal rule alongside existing rules.
graph.stages[0].actions.push({
  actionType: "WITHDRAW",
  configuration: {
    allowedStageKeys: [graph.stages[0].stableKey],
    resubmissionRule: "NOT_ALLOWED",
  },
  stableKey: "WITHDRAW",
  label: "Withdraw",
  enabled: true,
  reasonRequired: false,
  displayOrder: 99,
});

const actions = [
  ...new Map(
    graph.stages.flatMap((stage) =>
      stage.actions.map(
        (action) => [action.actionType, { action, stage }] as const,
      ),
    ),
  ).values(),
];

describe("universal workflow action reason", () => {
  it("covers all ten action types", () => {
    expect(actions).toHaveLength(10);
  });

  it.each(actions)(
    "uses only the configurable flag for $action.actionType",
    ({ action, stage }) => {
      const input = workflowActionInputSchema.parse({
        actionType: action.actionType,
        ...(action.actionType === "REQUEST_INFORMATION"
          ? {
              editableFieldPaths: action.configuration.editableFieldPaths,
              instructions: "Please provide supporting evidence.",
            }
          : {}),
        ...(action.actionType === "REFER"
          ? { question: "Please review this." }
          : {}),
        ...(action.actionType === "PUT_ON_HOLD"
          ? { reviewDate: "2027-01-15" }
          : {}),
        ...(action.actionType === "WITHDRAW" ? { confirmed: true } : {}),
        ...(action.actionType === "DEFER"
          ? {
              targetType: action.configuration.targetType,
              ...(action.configuration.targetType === "DATE"
                ? { targetDate: action.configuration.targetDate }
                : { targetCallKey: action.configuration.targetCallKey }),
            }
          : {}),
      });
      for (const required of [false, true]) {
        const configured: WorkflowActionDefinition =
          workflowActionDefinitionSchema.parse({
            ...action,
            reasonRequired: required,
            ...(action.actionType === "ESCALATE"
              ? {
                  configuration: { ...action.configuration, trigger: "MANUAL" },
                }
              : {}),
          });
        expect(workflowActionInputMetadata(configured).reason).toEqual({
          maxLength: 4_000,
          required,
        });
        expect(
          validateActionInputAgainstConfiguration(
            configured,
            input,
            stage.stableKey,
          ),
        ).toBe(required ? "A reason is required for this action." : null);
        expect(
          validateActionInputAgainstConfiguration(
            configured,
            {
              ...input,
              reason: "Reviewed the evidence; further assessment is needed.",
            },
            stage.stableKey,
          ),
        ).toBeNull();
        if (required) {
          expect(
            validateActionInputAgainstConfiguration(
              configured,
              { ...input, reason: "   " },
              stage.stableKey,
            ),
          ).toContain("A reason is required");
          expect(
            validateActionInputAgainstConfiguration(
              configured,
              { ...input, comment: "A comment is not the reason field." },
              stage.stableKey,
            ),
          ).toContain("A reason is required");
        }
      }
    },
  );

  it("accepts free text, trims it, limits length, and rejects code input", () => {
    expect(
      workflowActionInputSchema.parse({
        actionType: "REJECT",
        reason: "  Supporting evidence is missing.  ",
      }),
    ).toEqual({
      actionType: "REJECT",
      reason: "Supporting evidence is missing.",
    });
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "REJECT",
        reason: "x".repeat(4_001),
      }).success,
    ).toBe(false);
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "REJECT",
        reasonCode: "MISSING_EVIDENCE",
      }).success,
    ).toBe(false);
  });
});
