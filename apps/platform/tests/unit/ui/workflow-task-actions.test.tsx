import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WorkflowTaskActions } from "@/modules/work-queue/ui/WorkflowTaskActions";

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
});
