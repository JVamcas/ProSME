import { describe, expect, it } from "vitest";

import {
  standardTerminalOutcomes,
  terminalOutcomeApplicantStatus,
} from "@/modules/workflows/domain/transitions/WorkflowTerminalOutcome";
import { workflowTransitionSchema } from "@/modules/workflows/domain/transitions/WorkflowTransitionSchemas";
import {
  toWorkflowTransition,
  workflowTransitionFormDefaults,
  workflowTransitionFormSchema,
} from "@/modules/workflows/ui/definitions/WorkflowTransitionFormSchema";

const route = {
  actionKey: "DECIDE",
  sourceStageKey: "REVIEW",
  targetStageKeys: [],
  terminalOutcome: "RECOVERY",
  priority: 1,
  condition: null,
};

describe("terminal outcome applicant wording", () => {
  it.each(standardTerminalOutcomes)(
    "provides valid wording for %s",
    (outcome) => {
      const mapping = terminalOutcomeApplicantStatus(outcome);
      expect(mapping.label.length).toBeGreaterThan(0);
      expect(mapping.label.length).toBeLessThanOrEqual(120);
      expect(mapping.description.length).toBeGreaterThan(0);
      expect(mapping.description.length).toBeLessThanOrEqual(300);
    },
  );

  it("derives the code from the outcome while allowing custom wording", () => {
    const wording = {
      label: "Recovery review",
      description: "Please review the recovery decision.",
    };
    expect(terminalOutcomeApplicantStatus("RECOVERY", wording)).toEqual({
      ...wording,
      status: "OUTCOME_AVAILABLE",
    });
    expect(terminalOutcomeApplicantStatus("REJECTED_INCOMPLETE").status).toBe(
      "REJECTED_INCOMPLETE",
    );
    expect(terminalOutcomeApplicantStatus("CLOSED").status).toBe("CLOSED");
    expect(terminalOutcomeApplicantStatus("CUSTOM_OUTCOME")).toMatchObject({
      label: "Outcome available",
      status: "OUTCOME_AVAILABLE",
    });
  });

  it("preserves custom route wording through form and domain serialization", () => {
    const terminalApplicantStatus = {
      label: "Recovery review",
      description: "Please review the decision.",
    };
    const defaults = workflowTransitionFormDefaults(
      { ...route, terminalApplicantStatus },
      "DECIDE",
      "",
      1,
    );
    const saved = toWorkflowTransition(
      workflowTransitionFormSchema.parse(defaults),
      "REVIEW",
    );
    expect(workflowTransitionSchema.parse(saved)).toMatchObject({
      terminalApplicantStatus,
    });
    expect(
      toWorkflowTransition(
        { ...defaults, targetType: "STAGE", targetStageKeys: ["NEXT"] },
        "REVIEW",
      ).terminalApplicantStatus,
    ).toBeNull();
  });

  it("requires applicant wording only for terminal routes", () => {
    const defaults = workflowTransitionFormDefaults(route, "DECIDE", "", 1);
    expect(
      workflowTransitionFormSchema.safeParse({
        ...defaults,
        terminalApplicantLabel: " ",
      }).success,
    ).toBe(false);
    expect(
      workflowTransitionSchema.safeParse({
        ...route,
        terminalOutcome: null,
        targetStageKeys: ["NEXT"],
        terminalApplicantStatus: { label: "Label", description: "Description" },
      }).success,
    ).toBe(false);
    expect(
      workflowTransitionFormSchema.safeParse({
        ...defaults,
        targetType: "STAGE",
        targetStageKeys: ["NEXT"],
        terminalApplicantLabel: "",
        terminalApplicantDescription: "",
      }).success,
    ).toBe(true);
  });
});
