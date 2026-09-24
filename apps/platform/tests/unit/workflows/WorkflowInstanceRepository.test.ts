import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createWorkflowInstance } from "@/modules/workflows/infrastructure/WorkflowInstanceRepository";

const createdAt = new Date("2026-09-21T08:30:00.000Z");
const record = {
  applicationId: "11111111-1111-4111-8111-111111111111",
  completedAt: null,
  createdAt,
  id: "22222222-2222-4222-8222-222222222222",
  startedAt: createdAt,
  status: "ACTIVE" as const,
  workflowTemplateVersionId: "33333333-3333-4333-8333-333333333333",
};

const returning = vi.fn();
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));

beforeEach(() => {
  vi.clearAllMocks();
  returning.mockResolvedValue([record]);
});

describe("workflow instance repository", () => {
  it("creates an active instance pinned to the exact template version", async () => {
    const result = await createWorkflowInstance(
      { insert } as never,
      {
        applicationId: record.applicationId,
        startedAt: createdAt,
        workflowTemplateVersionId: record.workflowTemplateVersionId,
      },
    );

    expect(values).toHaveBeenCalledWith({
      applicationId: record.applicationId,
      createdAt,
      startedAt: createdAt,
      workflowTemplateVersionId: record.workflowTemplateVersionId,
    });
    expect(result).toEqual(record);
  });
});
