import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";

const target = {
  action: {
    configuration: {},
    actionType: "APPROVE_ADVANCE" as const,
    displayOrder: 1,
    enabled: true,
    label: "Execute agreement",
    reasonCodeRequired: false,
    stableKey: "EXECUTE_AGREEMENT",
  },
  stage: {
    stageDefinitionId: "2dd8b9a0-7b6f-4311-9ce5-74c17bc1b645",
    workflowVersionId: "02bd9029-d1c3-4286-85bc-4a67d6a2e4b5",
  },
};

describe("workflow action target repository", () => {
  it("validates normalized transition targets after the legacy column is removed", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ valid: true }] });

    await expect(
      configuredActionTargetsAreValid({ execute } as never, target),
    ).resolves.toBe(true);

    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("app_workflow_transition_targets");
    expect(query.sql).toContain("transition_target.target_stage_id");
    expect(query.sql).not.toContain("transition.to_stage_id");
  });

  it("returns false when the database reports an invalid target", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ valid: false }] });

    await expect(
      configuredActionTargetsAreValid({ execute } as never, target),
    ).resolves.toBe(false);
  });
});
