// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormFieldDialog } from "@/modules/forms/ui/builder/FormFieldDialog";
import type { FormField } from "@/modules/forms/FormTypes";

vi.mock("@/modules/forms/ui/builder/FormVisibilityConditionEditor", () => ({
  FormVisibilityConditionEditor: () => null,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const existing: FormField = {
  id: "10000000-0000-4000-8000-000000000001",
  sectionId: "20000000-0000-4000-8000-000000000001",
  key: "REGISTERED_NAME",
  label: "Registered name",
  type: "TEXT",
  columnSpan: 1,
  helpText: "",
  order: 1,
  required: false,
  options: [],
  visibilityCondition: null,
};

async function saveField(field?: FormField, type?: "CHECKBOX") {
  const saved = vi.fn().mockResolvedValue(undefined);
  const closed = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(
      <FormFieldDialog
        field={field}
        fields={[existing]}
        visibilityFields={[]}
        isOpen
        nextOrder={2}
        onClose={closed}
        onSave={saved}
        sectionColumnSpan={1}
        sectionId={existing.sectionId}
      />,
    ));
    expect(document.querySelector('[name="key"]')).toBeNull();
    expect(document.body.textContent).not.toContain("Field key");
    if (type) {
      await act(async () => {
        const select = document.querySelector<HTMLSelectElement>('[name="type"]')!;
        expect(Array.from(select.options).some((option) => option.textContent === "Checkbox")).toBe(true);
        select.value = type;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="label"]')!;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        type === "CHECKBOX" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        "value",
      )!.set!;
      setValue.call(input, field ? "Renamed business name" : "Registered name");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const form = document.querySelector<HTMLFormElement>('[role="dialog"] form')!;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(saved).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledTimes(1);
    return saved.mock.calls[0][0] as FormField;
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
}

describe("automatic form field keys", () => {
  it("preserves document limits when editing a field", async () => {
    const field = await saveField({
      ...existing,
      type: "DOCUMENT",
      maxPages: 12,
      maximumFileSizeMb: 4,
    });
    expect(field.maxPages).toBe(12);
    expect(field.maximumFileSizeMb).toBe(4);
  });
  it("can configure a checkbox through the field type selector", async () => {
    const field = await saveField(undefined, "CHECKBOX");
    expect(field.type).toBe("CHECKBOX");
    expect(field.key).toBe("REGISTERED_NAME_2");
  });
  it("generates a unique key from the label when adding a field", async () => {
    const field = await saveField();
    expect(field.key).toBe("REGISTERED_NAME_2");
    expect(field.label).toBe("Registered name");
  });

  it("preserves the stored key when renaming an existing field", async () => {
    const field = await saveField(existing);
    expect(field.key).toBe("REGISTERED_NAME");
    expect(field.label).toBe("Renamed business name");
  });
});
