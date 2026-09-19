import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FormEditorLifecycleActions } from "@/components/admin/forms/FormEditorLifecycleActions";

function renderActions(overrides: Partial<
  Parameters<typeof FormEditorLifecycleActions>[0]
> = {}) {
  return renderToStaticMarkup(
    <FormEditorLifecycleActions
      canPublish
      canRetire
      canUpdate
      clonePending={false}
      isDraft
      isPublished={false}
      onClone={vi.fn()}
      onPublish={vi.fn()}
      onRetire={vi.fn()}
      publishPending={false}
      retirePending={false}
      {...overrides}
    />,
  );
}

describe("form editor lifecycle actions", () => {
  it("does not disable Publish for another action's pending state", () => {
    const markup = renderActions({ clonePending: true });
    expect(markup).toContain(">Publish</button>");
    expect(markup).not.toContain("Publishing…");
  });

  it("shows Publish's own pending state", () => {
    const markup = renderActions({ publishPending: true });
    expect(markup).toContain("Publishing…");
  });
});
