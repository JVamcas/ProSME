// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormSectionDialog } from "@/modules/forms/ui/builder/FormSectionDialog";
import type { FormSection } from "@/modules/forms/FormTypes";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const existing: FormSection = {
  id: "80000000-0000-4000-8000-000000000001",
  key: "BUSINESS_DETAILS",
  title: "Old title",
  description: "Existing section description",
  columnSpan: 2,
  order: 1,
  showContainer: false,
  visibilityCondition: null,
};

describe("automatic section keys", () => {
  it.each([undefined, existing])(
    "hides the key while generating new keys or preserving existing ones",
    async (section) => {
      const save = vi.fn().mockResolvedValue(undefined);
      const close = vi.fn();
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () =>
          root.render(
            <FormSectionDialog
              isOpen
              fields={[]}
              nextOrder={2}
              onClose={close}
              onSave={save}
              section={section}
            />,
          ),
        );
        const dialog = document.body.querySelector('[role="dialog"]')!;
        expect(dialog.textContent).not.toContain("Section key");
        expect(dialog.querySelector('input[name="key"]')).toBeNull();
        const title = dialog.querySelector<HTMLInputElement>(
          'input[name="title"]',
        )!;
        const setValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!;
        await act(async () => {
          setValue.call(title, "Business details");
          title.dispatchEvent(new Event("input", { bubbles: true }));
          dialog
            .querySelector("form")!
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );
        });
        expect(save).toHaveBeenCalledWith(
          expect.objectContaining({
            key: section?.key ?? expect.stringMatching(/^K_[A-F0-9]{32}$/),
            title: "Business details",
            columnSpan: section?.columnSpan ?? 3,
            order: section?.order ?? 2,
            visibilityCondition: null,
          }),
        );
        if (section) expect(save.mock.calls[0][0].id).toBe(section.id);
        expect(close).toHaveBeenCalled();
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    },
  );
});
