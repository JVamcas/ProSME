import { drizzle } from "drizzle-orm/node-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readWorkflowTaskFormResponse } from "@/modules/forms/infrastructure/WorkflowTaskFormResponseRepository";

const query = vi.fn();
const taskId = "10000000-0000-4000-8000-000000000001";
const versionId = "20000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue(drizzle({ client: { query } as never }) as never);
});

describe("oversight task form response projection", () => {
  it("projects saved response fields with exact task, assignee, and pinned version filters", async () => {
    query.mockResolvedValue({ rows: [[
      "response", taskId, versionId, "assignee", "DRAFT", { note: "Saved" }, null, 3, null,
    ]] });
    expect(await readWorkflowTaskFormResponse(taskId, versionId)).toEqual({
      id: "response", workflowTaskId: taskId, formVersionId: versionId,
      respondentUserId: "assignee", status: "DRAFT", values: { note: "Saved" },
      definitionSnapshot: null, rowVersion: 3, completedAt: null,
    });
    const [options, parameters] = query.mock.calls[0];
    expect(options.text).toContain('inner join "app_workflow_tasks"');
    expect(options.text).toContain('"app_workflow_tasks"."assigned_user_id" = "app_form_responses"."respondent_user_id"');
    expect(options.text).toContain('"app_workflow_tasks"."form_version_id" = "app_form_responses"."form_version_id"');
    expect(options.text).toContain('where ("app_form_responses"."workflow_task_id" = $1 and "app_form_responses"."form_version_id" = $2)');
    expect(options.text).not.toContain('"created_by"');
    expect(options.text).not.toContain('select *');
    expect(parameters).toEqual([taskId, versionId, 1]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("returns no response when the scoped task/version/assignee match is absent", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await readWorkflowTaskFormResponse(taskId, versionId)).toBeNull();
  });
});
