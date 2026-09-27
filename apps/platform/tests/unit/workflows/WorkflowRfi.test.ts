import { describe, expect, it } from "vitest";

import {
  canTransitionWorkflowRfi,
  workflowRfiStatuses,
} from "@/modules/workflows/domain/runtime/WorkflowRfi";

describe("workflow RFI lifecycle", () => {
  it("allows only the authoritative lifecycle transitions", () => {
    expect(canTransitionWorkflowRfi("OPEN", "RESPONDED")).toBe(true);
    expect(canTransitionWorkflowRfi("OPEN", "CLOSED")).toBe(true);
    expect(canTransitionWorkflowRfi("OPEN", "EXPIRED")).toBe(true);
    expect(canTransitionWorkflowRfi("RESPONDED", "CLOSED")).toBe(true);
    expect(canTransitionWorkflowRfi("RESPONDED", "EXPIRED")).toBe(false);
  });

  it.each(["CLOSED", "EXPIRED"] as const)(
    "does not reopen terminal status %s",
    (status) => {
      for (const target of workflowRfiStatuses) {
        expect(canTransitionWorkflowRfi(status, target)).toBe(false);
      }
    },
  );
});
