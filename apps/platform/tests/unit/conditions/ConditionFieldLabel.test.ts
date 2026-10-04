import { describe, expect, it } from "vitest";

import { formatConditionFieldLabel } from "@/modules/conditions/domain/ConditionFieldLabel";
import { workflowRuntimeContextFields } from "@/modules/workflows/domain/WorkflowRuntimeContextFieldCatalogue";

describe("condition field source labels", () => {
  it.each([
    ["application.id", "[Application].ID"],
    ["fundingCall.title", "[Funding Call].title"],
    ["eligibility.hard_failure_count", "[Eligibility].hard failure count"],
    ["workflow.id", "[Workflow].ID"],
    ["stage.id", "[Stage].instance ID"],
    ["task.id", "[Task].instance ID"],
  ])("identifies the source of %s", (key, expected) => {
    const field = workflowRuntimeContextFields.find((item) => item.key === key);
    expect(field).toBeDefined();
    expect(formatConditionFieldLabel(field!)).toBe(expected);
    expect(field?.key).toBe(key);
  });

  it("formats configured stage and task names without parsing their labels", () => {
    expect(formatConditionFieldLabel({
      label: "Approve",
      source: [
        { label: "Stage", name: "Approval and Award Decision" },
        { label: "Task", name: "Delegated Approval" },
      ],
    })).toBe(
      "[Stage → Approval and Award Decision].[Task → Delegated Approval].Approve",
    );
  });

  it("preserves labels for fields whose source is unavailable", () => {
    expect(formatConditionFieldLabel({ label: "Legacy custom field" })).toBe(
      "Legacy custom field",
    );
    expect(formatConditionFieldLabel({ label: "Local field", source: [] })).toBe(
      "Local field",
    );
  });
});
