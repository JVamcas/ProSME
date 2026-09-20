import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  WorkflowTaskActions,
  workflowActionButtonVariants,
} from "@/modules/work-queue/ui/WorkflowTaskActions";
import { workflowActionTypes } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";

describe("workflow task actions", () => {
  it("presents the configured action labels in the supplied order", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskActions
        actions={[
          {
            actionType: "APPROVE_ADVANCE",
            key: "RECOMMEND",
            label: "Recommend",
          },
          {
            actionType: "REQUEST_INFORMATION",
            key: "REQUEST_CLARIFICATION",
            label: "Request clarification",
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

    expect(markup).toContain("No workflow action is available for this task.");
    expect(markup).not.toContain("type=\"submit\"");
  });

  it("defines a visual variant for every workflow action type", () => {
    expect(Object.keys(workflowActionButtonVariants).sort())
      .toEqual([...workflowActionTypes].sort());
    expect(workflowActionButtonVariants).toEqual({
      APPROVE_ADVANCE: "success",
      DEFER: "subtle",
      ESCALATE: "primary",
      PUT_ON_HOLD: "yellow",
      REFER: "navy",
      REJECT: "danger",
      REQUEST_INFORMATION: "outlineOrange",
      RETURN: "outline",
      WITHDRAW: "danger",
    });
  });
});
