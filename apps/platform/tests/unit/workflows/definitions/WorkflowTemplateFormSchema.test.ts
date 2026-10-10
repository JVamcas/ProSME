import { describe, expect, it } from "vitest";
import { workflowTemplateFormSchema } from "@/modules/workflows/api/WorkflowTemplateFormSchema";
import { isWorkflowStableKey } from "@/modules/workflows/domain/WorkflowStableKey";

describe("generated workflow template codes", () => {
  it("uses the existing label normalization for a new template", () => {
    const input = workflowTemplateFormSchema().parse({
      name: "SME grant workflow",
      description: "Reusable workflow",
    });
    expect(input).toMatchObject({
      name: "SME grant workflow",
      description: "Reusable workflow",
    });
    expect(input.code).toMatch(/^SME_GRANT_WORKFLOW_[A-F0-9]{12}$/);
  });

  it("gives repeated copies of the same template different codes", () => {
    const schema = workflowTemplateFormSchema();
    const first = schema.parse({ name: "Copy of Standard workflow" });
    const second = schema.parse({ name: "Copy of Standard workflow" });
    expect(first.code).not.toBe(second.code);
    expect(first.description).toBe("");
  });

  it.each(["2026 workflow", "你好模板", "Long workflow name ".repeat(8)])(
    "keeps unusual and long names within the stored code contract",
    (name) => {
      const result = workflowTemplateFormSchema().parse({ name });
      expect(isWorkflowStableKey(result.code)).toBe(true);
      expect(result.code.length).toBeLessThanOrEqual(80);
      expect(result.code).toMatch(/_[A-F0-9]{12}$/);
    },
  );

  it("preserves the existing code when a definition is renamed", () => {
    const result = workflowTemplateFormSchema("SME_FUND_STANDARD").parse({
      name: "Renamed workflow",
      description: "Updated",
    });
    expect(result.code).toBe("SME_FUND_STANDARD");
  });

  it("requires a valid template name", () => {
    expect(workflowTemplateFormSchema().safeParse({ name: " " }).success).toBe(
      false,
    );
  });
});
