// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormFieldDialog } from "@/modules/forms/ui/builder/FormFieldDialog";
import type { FormField } from "@/modules/forms/FormTypes";
import { condition } from "../../support/FormFieldRuleFixture";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const sectionId = "90000000-0000-4000-8000-000000000001";
const existing: FormField = {
  id: "90000000-0000-4000-8000-000000000002",
  key: "OLD_QUESTION_KEY",
  label: "Old question",
  type: "TEXT",
  order: 1,
  required: false,
  sectionId,
  columnSpan: 1,
  visibilityCondition: condition("ENABLED"),
};

describe("UUID form field keys", () => {
  it.each([undefined, existing])(
    "uses UUIDs for new fields and preserves existing keys when the label changes",
    async (field) => {
      const save = vi.fn().mockResolvedValue(undefined);
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const label =
        "If the business is involved in public procurement or receives subsidies, can it prove that it has no links to Russia?";
      try {
        await act(async () =>
          root.render(
            <FormFieldDialog
              isOpen
              field={field}
              fields={[]}
              nextOrder={2}
              onClose={vi.fn()}
              onSave={save}
              sectionColumnSpan={3}
              sectionId={sectionId}
            />,
          ),
        );
        const dialog = document.body.querySelector('[role="dialog"]')!;
        const input = dialog.querySelector<HTMLInputElement>(
          'input[name="label"]',
        )!;
        const setValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!;
        await act(async () => {
          setValue.call(input, label);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          dialog
            .querySelector("form")!
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );
        });
        expect(save).not.toHaveBeenCalled();
        await act(async () => {
          dialog
            .querySelector("form")!
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );
        });
        expect(save).toHaveBeenCalledWith(
          expect.objectContaining({
            key: field?.key ?? expect.stringMatching(/^K_[A-F0-9]{32}$/),
            label,
            sectionId,
            visibilityCondition: field?.visibilityCondition ?? null,
          }),
        );
        if (field) expect(save.mock.calls[0][0].id).toBe(field.id);
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    },
  );
});
