// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormEditorLifecycleActions } from "@/modules/forms/ui/FormEditorLifecycleActions";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

async function withActions(
  overrides: Partial<Parameters<typeof FormEditorLifecycleActions>[0]>,
  check: () => void,
) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <FormEditorLifecycleActions
          canPublish
          canRetire
          canUpdate
          clonePending={false}
          isDraft
          isPublished={false}
          onClone={vi.fn()}
          onEdit={vi.fn()}
          onPreview={vi.fn()}
          onPublish={vi.fn()}
          onRetire={vi.fn()}
          publishPending={false}
          retirePending={false}
          updatePending={false}
          {...overrides}
        />,
      );
    });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Form actions"]')!
        .click();
    });
    check();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

function action(label: string) {
  return Array.from(document.body.querySelectorAll('[role="menuitem"]')).find(
    (item) => item.textContent === label,
  )!;
}

describe("form editor lifecycle actions", () => {
  it("does not disable Publish for another action's pending state", async () => {
    await withActions({ clonePending: true }, () => {
      expect(action("Publish").getAttribute("aria-disabled")).not.toBe("true");
      expect(document.body.textContent).not.toContain("Publishing…");
    });
  });

  it("shows Publish's own pending state", async () => {
    await withActions({ publishPending: true }, () => {
      expect(action("Publishing…").getAttribute("aria-disabled")).toBe("true");
    });
  });

  it("always offers a preview of the loaded form version", async () => {
    await withActions({ canPublish: false, canUpdate: false }, () => {
      expect(action("Preview").getAttribute("aria-disabled")).not.toBe("true");
    });
  });
});
