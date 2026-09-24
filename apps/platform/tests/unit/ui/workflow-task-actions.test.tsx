import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  WorkflowTaskActions,
} from "@/modules/work-queue/ui/WorkflowTaskActions";

const requiredInput = {
  comment: { maxLength: 4_000, required: false },
  confirmation: { message: null, required: false },
  dueDate: { deadlineDays: null, required: false },
  editableFieldKeys: [],
  reasonCode: { options: [], required: false },
  reasonOrCommentRequired: false,
  reviewDate: { required: false },
  target: { type: null, value: null },
} as const;

describe("workflow task actions", () => {
  it("presents the configured action labels in the supplied order", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskActions
        actions={[
          {
            actionType: "APPROVE_ADVANCE",
            available: true,
            key: "RECOMMEND",
            label: "Recommend",
            presentation: { displayOrder: 1, variant: "success" },
            requiredInput,
            runtimeVersion: 4,
            unavailableReason: null,
          },
          {
            actionType: "REQUEST_INFORMATION",
            available: true,
            key: "REQUEST_CLARIFICATION",
            label: "Request clarification",
            presentation: { displayOrder: 2, variant: "outlineOrange" },
            requiredInput,
            runtimeVersion: 4,
            unavailableReason: null,
          },
        ]}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    expect(markup).toContain("Workflow actions");
    expect(markup.indexOf("Recommend")).toBeLessThan(
      markup.indexOf("Request clarification"),
    );
    expect(markup.match(/type="submit"/g)).toHaveLength(2);
  });

  it("does not invent a fallback action", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskActions
        actions={[]}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    expect(markup).toContain("No workflow actions are configured for this task.");
    expect(markup).not.toContain("type=\"submit\"");
  });

  it("disables unavailable actions and presents the safe reason", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskActions
        actions={[{
          actionType: "REJECT",
          available: false,
          key: "REJECT",
          label: "Reject",
          presentation: { displayOrder: 1, variant: "danger" },
          requiredInput,
          runtimeVersion: 4,
          unavailableReason: "Requirements are not currently met.",
        }]}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain("Requirements are not currently met.");
  });
});
