import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { allocateStageReviewers } from "@/modules/workflows/infrastructure/WorkflowTaskAutoAssignmentRepository";
import type { WorkflowInstanceTransaction } from "@/modules/workflows/infrastructure/WorkflowInstanceRepository";

const roleId = "11111111-1111-4111-8111-111111111111";
const workflowId = "22222222-2222-4222-8222-222222222222";
const definitionId = "33333333-3333-4333-8333-333333333333";
const reviewers = [
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
];

function transaction(rows: Array<Record<string, unknown>>) {
  return {
    execute: vi.fn().mockResolvedValue({ rows }),
  } as unknown as WorkflowInstanceTransaction;
}

const task = {
  id: definitionId,
  namedUserOverrideId: null,
  reviewerCount: 3,
  roleId,
  stableKey: "TECHNICAL_REVIEW",
};

describe("automatic reviewer allocation", () => {
  it("assigns a distinct eligible person to each reviewer slot", async () => {
    const rows = reviewers.map((userId, workload) => ({
      roleId,
      taskDefinitionId: definitionId,
      userId,
      workload,
    }));
    const result = await allocateStageReviewers(
      transaction(rows),
      workflowId,
      [task],
    );
    expect(result.get(definitionId)).toEqual(reviewers);
  });

  it("rejects an ineligible named reviewer", async () => {
    await expect(allocateStageReviewers(
      transaction([]),
      workflowId,
      [{
        ...task,
        namedUserOverrideId: reviewers[0],
        reviewerCount: 1,
        roleId: null,
      }],
    )).rejects.toThrow("named reviewer is ineligible");
  });

  it("blocks activation when fewer eligible people exist than slots", async () => {
    const rows = reviewers.slice(0, 2).map((userId) => ({
      roleId,
      taskDefinitionId: definitionId,
      userId,
      workload: 0,
    }));
    await expect(allocateStageReviewers(
      transaction(rows),
      workflowId,
      [task],
    )).rejects.toThrow("3 eligible reviewers are required");
  });
});
