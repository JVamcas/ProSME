import { describe, expect, it } from "vitest";

import {
  canTransitionWorkflowTask,
  isTerminalWorkflowTaskStatus,
} from "@/modules/workflows/domain/runtime/WorkflowTaskLifecycle";

describe("workflow task lifecycle", () => {
  it.each([
    ["PENDING", "CLAIMED"],
    ["PENDING", "CANCELLED"],
    ["CLAIMED", "IN_PROGRESS"],
    ["CLAIMED", "CANCELLED"],
    ["IN_PROGRESS", "COMPLETED"],
    ["IN_PROGRESS", "CANCELLED"],
  ] as const)("allows %s to move to %s", (current, target) => {
    expect(canTransitionWorkflowTask(current, target)).toBe(true);
  });

  it.each([
    ["PENDING", "COMPLETED"],
    ["CLAIMED", "COMPLETED"],
    ["IN_PROGRESS", "CLAIMED"],
    ["COMPLETED", "CANCELLED"],
    ["CANCELLED", "PENDING"],
  ] as const)("rejects %s to %s", (current, target) => {
    expect(canTransitionWorkflowTask(current, target)).toBe(false);
  });

  it("treats completed and cancelled as terminal", () => {
    expect(isTerminalWorkflowTaskStatus("COMPLETED")).toBe(true);
    expect(isTerminalWorkflowTaskStatus("CANCELLED")).toBe(true);
    expect(isTerminalWorkflowTaskStatus("IN_PROGRESS")).toBe(false);
  });
});
