import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readTaskCoiGate } from "@/modules/workflows/infrastructure/WorkflowCoiRepository";

const actorId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const execute = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue({ rows: [] });
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

describe("workflow COI gate projection", () => {
  it("loads clearance by application and reviewer", async () => {
    await expect(readTaskCoiGate(actorId, taskId)).resolves.toBeNull();

    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("app_workflow_application_coi");
    expect(query.sql).toContain(
      "clearance.application_id = workflow.application_id",
    );
    expect(query.sql).toContain("clearance.user_id =");
    expect(query.params).toContain(actorId);
    expect(query.params).toContain(taskId);
  });
});
