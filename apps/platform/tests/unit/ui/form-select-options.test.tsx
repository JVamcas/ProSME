// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormFieldDialog } from "@/modules/forms/ui/builder/FormFieldDialog";
import type { FormField } from "@/modules/forms/FormTypes";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const field: FormField = {
  id: "a0000000-0000-4000-8000-000000000001",
  key: "REGISTRATION_STATUS",
  label: "Registration status",
  type: "SINGLE_SELECT",
  sectionId: "a0000000-0000-4000-8000-000000000002",
  columnSpan: 1,
  order: 1,
  required: false,
  options: [
    { key: "REGISTERED", label: "Registered", order: 1 },
    { key: "NOT_REGISTERED", label: "Not registered", order: 2 },
    { key: "NOT_APPLICABLE", label: "Not applicable", order: 3 },
  ],
};

async function mount() {
  const save = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <FormFieldDialog
        isOpen
        field={field}
        fields={[field]}
        nextOrder={2}
        onSave={save}
        onClose={close}
        sectionId={field.sectionId}
        sectionColumnSpan={3}
      />,
    ),
  );
  await act(async () => {
    Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "Next")!
      .click();
  });
  return {
    save,
    close,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

function dialogs() {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="dialog"]'),
  );
}

async function rowAction(label: string, actionLabel: string) {
  await act(async () =>
    document.body
      .querySelector<HTMLButtonElement>(
        `[aria-label="Actions for option ${label}"]`,
      )!
      .click(),
  );
  const item = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ).find((element) => element.textContent === actionLabel)!;
  await act(async () => item.click());
}

async function type(dialog: HTMLElement, name: string, value: string) {
  const input = dialog.querySelector<HTMLInputElement>(
    `input[name="${name}"]`,
  )!;
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  await act(async () => {
    setValue.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit(dialog: HTMLElement) {
  await act(async () =>
    dialog
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

async function addOption() {
  const button = Array.from(dialogs()[0].querySelectorAll("button")).find(
    (element) => element.textContent === "Add option",
  )!;
  await act(async () => button.click());
  return dialogs()[1];
}

describe("select options table and dialog", () => {
  it("edits, removes and adds options locally while preserving keys and contiguous order until Save field", async () => {
    const workspace = await mount();
    try {
      const parent = dialogs()[0];
      expect(parent.querySelector("table")).not.toBeNull();
      expect(parent.querySelector('input[name="options.0.key"]')).toBeNull();
      await rowAction("Registered", "Edit");
      expect(dialogs()).toHaveLength(2);
      const edit = dialogs()[1];
      expect(
        edit.querySelector<HTMLInputElement>('input[name="key"]')!.value,
      ).toBe("REGISTERED");
      await type(edit, "label", "Registered firm");
      await submit(edit);
      expect(dialogs()).toHaveLength(1);
      expect(workspace.save).not.toHaveBeenCalled();
      expect(parent.textContent).toContain("Registered firm");

      await rowAction("Not registered", "Remove");
      expect(parent.textContent).not.toContain("Not registered");
      const added = await addOption();
      const generated =
        added.querySelector<HTMLInputElement>('input[name="key"]')!.value;
      expect(generated).toMatch(/^K_[A-F0-9]{32}$/);
      await type(added, "label", "Provisional");
      await submit(added);
      expect(dialogs()).toHaveLength(1);
      expect(workspace.save).not.toHaveBeenCalled();
      await submit(parent);
      expect(workspace.save).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [
            { key: "REGISTERED", label: "Registered firm", order: 1 },
            { key: "NOT_APPLICABLE", label: "Not applicable", order: 2 },
            { key: generated, label: "Provisional", order: 3 },
          ],
        }),
      );
    } finally {
      await workspace.cleanup();
    }
  });

  it("rejects duplicate keys in the option dialog and Escape closes only that dialog", async () => {
    const workspace = await mount();
    try {
      const added = await addOption();
      await type(added, "key", "REGISTERED");
      await type(added, "label", "Duplicate");
      await submit(added);
      expect(added.textContent).toContain("This option key is already in use.");
      expect(dialogs()).toHaveLength(2);
      expect(workspace.save).not.toHaveBeenCalled();
      await act(async () =>
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        ),
      );
      expect(dialogs()).toHaveLength(1);
      expect(workspace.close).not.toHaveBeenCalled();
      expect(dialogs()[0].textContent).not.toContain("Duplicate");
      await submit(dialogs()[0]);
      expect(workspace.save).toHaveBeenCalledWith(
        expect.objectContaining({ options: field.options }),
      );
    } finally {
      await workspace.cleanup();
    }
  });
});
