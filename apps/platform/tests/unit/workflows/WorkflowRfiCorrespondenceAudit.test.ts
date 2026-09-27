import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  workflowRfiLifecycleEventCodes,
} from "@/modules/workflows/domain/runtime/WorkflowRfi";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "drizzle/0115_rfi_correspondence_events_audit.sql",
  ),
  "utf8",
);

describe("workflow RFI correspondence, events, and audit", () => {
  it("defines only the required lifecycle event contract", () => {
    expect(workflowRfiLifecycleEventCodes).toEqual([
      "RFI_CREATED",
      "RFI_RESPONDED",
      "RFI_CLOSED",
      "RFI_EXPIRED",
    ]);
  });

  it("migrates explicit immutable ordering for both histories", () => {
    expect(migration).toContain(
      "conversation_sequence\" bigint GENERATED ALWAYS AS IDENTITY",
    );
    expect(migration).toContain(
      "lifecycle_sequence\" bigint GENERATED ALWAYS AS IDENTITY",
    );
    expect(migration).toContain(
      "app_workflow_rfi_lifecycle_events_immutable",
    );
    expect(migration).toContain(
      "BEFORE UPDATE OR DELETE ON \"app_workflow_rfi_lifecycle_events\"",
    );
  });

  it.each([
    "application_id",
    "workflow_instance_id",
    "stage_instance_id",
    "task_id",
    "action_definition_id",
  ])("preserves stable lifecycle source reference %s", (column) => {
    expect(migration).toContain(`ALTER COLUMN "${column}" SET NOT NULL`);
  });
});
