import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runtimeAuditEventCodes } from "@/modules/workflows/domain/runtime/RuntimeAuditEvent";

describe("runtime audit trail contract", () => {
  it("defines every required runtime event", () => {
    expect(runtimeAuditEventCodes).toEqual([
      "WORKFLOW_CREATED",
      "STAGE_ACTIVATED",
      "TASK_CREATED",
      "TASK_ASSIGNED",
      "TASK_STARTED",
      "TASK_COMPLETED",
      "ACTION_EXECUTED",
      "STAGE_COMPLETED",
      "TRANSITION_EXECUTED",
    ]);
  });

  it("migrates first-class runtime context and preserves immutability", () => {
    const migration = readFileSync(
      path.resolve(process.cwd(), "drizzle/0061_runtime_audit_trail.sql"),
      "utf8",
    );
    const originalAuditMigration = readFileSync(
      path.resolve(process.cwd(), "drizzle/0011_phase3_workflow_configuration.sql"),
      "utf8",
    );

    expect(migration).toContain('"workflow_instance_id" uuid');
    expect(migration).toContain('"stage_instance_id" uuid');
    expect(migration).toContain('"task_id" uuid');
    expect(migration).toContain('"runtime_sequence" bigint');
    expect(originalAuditMigration).toContain("BEFORE UPDATE OR DELETE");
    expect(originalAuditMigration).toContain(
      "workflow audit entries are immutable",
    );
  });
});
