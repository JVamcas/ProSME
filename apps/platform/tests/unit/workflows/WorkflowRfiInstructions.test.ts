import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  sanitizeWorkflowRfiInstructions,
  workflowRfiInstructionsSummary,
} from "@/modules/workflows/infrastructure/WorkflowRfiInstructions";

describe("workflow RFI applicant instructions", () => {
  it("preserves supported formatting and removes unsafe markup", () => {
    const sanitized = sanitizeWorkflowRfiInstructions(
      '<h2>Evidence</h2><script>alert(1)</script><p onclick="bad()">Upload <strong>both</strong> files.</p>',
    );

    expect(sanitized).toBe(
      "<h2>Evidence</h2><p>Upload <strong>both</strong> files.</p>",
    );
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onclick");
  });

  it("derives a plain applicant-facing summary", () => {
    expect(
      workflowRfiInstructionsSummary(
        "<p>Please provide the <strong>signed</strong> declaration.</p>",
      ),
    ).toBe("Please provide the signed declaration.");
  });
});
