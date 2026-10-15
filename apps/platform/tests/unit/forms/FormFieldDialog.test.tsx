// @vitest-environment happy-dom
import { condition } from "../../support/FormFieldRuleFixture";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormFieldDialog } from "@/modules/forms/ui/builder/FormFieldDialog";
import type { FormField } from "@/modules/forms/FormTypes";

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

async function saveField(field?: FormField, type?: "CHECKBOX" | "COMMENT") {
  const saved = vi.fn().mockResolvedValue(undefined);
  const closed = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <FormFieldDialog
          field={field}
          fields={[existing]}
          isOpen
          nextOrder={2}
          onClose={closed}
          onSave={saved}
          sectionColumnSpan={1}
          sectionId={existing.sectionId}
        />,
      ),
    );
    expect(document.querySelector('[name="key"]')).toBeNull();
    expect(document.body.textContent).not.toContain("Field key");
    for (const title of [
      "Validation rules",
      "Visibility condition",
      "Editable when",
      "Required when",
    ]) {
      expect(document.body.textContent).not.toContain(title);
    }
    if (type) {
      await act(async () => {
        const select =
          document.querySelector<HTMLSelectElement>('[name="type"]')!;
        expect(
          Array.from(select.options).some(
            (option) => option.textContent === "Checkbox",
          ),
        ).toBe(true);
        select.value = type;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    const input = document.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >('[name="label"]')!;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        type === "CHECKBOX"
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        "value",
      )!.set!;
      setValue.call(input, field ? "Renamed business name" : "Registered name");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")!
        .click();
    });
    expect(saved).not.toHaveBeenCalled();
    if (field?.type === "DOCUMENT") {
      const uploader = document.querySelector<HTMLSelectElement>(
        '[name="uploadedBy"]',
      )!;
      expect(
        Array.from(uploader.options)
          .map((option) => option.textContent)
          .filter((label) => label !== "Select an option"),
      ).toEqual(
        expect.arrayContaining(["Applicant", "Any", "Assigned reviewer"]),
      );
      expect(
        Array.from(uploader.options).some(
          (option) => option.textContent === "Staff",
        ),
      ).toBe(false);
      expect(document.body.textContent).not.toContain(
        "Workflow document evidence",
      );
      expect(document.body.textContent).not.toContain(
        "Use workflow document evidence",
      );
      expect(document.body.textContent).not.toContain("Verified by");
      expect(document.querySelector('[name="maxPages"]')).not.toBeNull();
      expect(
        document.querySelector('[name="maximumFileSizeMb"]'),
      ).not.toBeNull();
    }
    const form = document.querySelector<HTMLFormElement>(
      '[role="dialog"] form',
    )!;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
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
      acceptedExtensions: [".pdf"],
      maxPages: 12,
      maximumFileSizeMb: 4,
    });
    expect(field.acceptedExtensions).toEqual([".pdf"]);
    expect(field.maxPages).toBe(12);
    expect(field.uploadedBy).toBe("APPLICANT");
    expect(field.maximumFileSizeMb).toBe(4);
  });
  it("can configure a checkbox through the field type selector", async () => {
    const field = await saveField(undefined, "CHECKBOX");
    expect(field.type).toBe("CHECKBOX");
    expect(field.key).toMatch(/^K_[A-F0-9]{32}$/);
  });
  it("preserves selected document formats without a page limit", async () => {
    const field = await saveField({
      ...existing,
      type: "DOCUMENT",
      acceptedExtensions: [".xls", ".xlsx", ".csv"],
    });
    expect(field.acceptedExtensions).toEqual([".xls", ".xlsx", ".csv"]);
  });

  it("generates a UUID key when adding a field", async () => {
    const field = await saveField();
    expect(field.key).toMatch(/^K_[A-F0-9]{32}$/);
    expect(field.label).toBe("Registered name");
  });

  it("preserves the stored key when renaming an existing field", async () => {
    const field = await saveField(existing);
    expect(field.key).toBe("REGISTERED_NAME");
    expect(field.label).toBe("Renamed business name");
  });
});

it("preserves rules and visibility when saving field details", async () => {
  const original: FormField = {
    ...existing,
    visibilityCondition: condition("ENABLED"),
    rules: {
      validationCondition: condition("AMOUNT", 10),
      editableCondition: condition("ENABLED"),
      requiredCondition: condition("ENABLED"),
      validationSettings: {
        message: "Check amount",
        modes: ["SUBMIT"],
        missing: "REJECT",
      },
    },
  };
  const saved = await saveField(original);
  expect(saved.rules).toEqual(original.rules);
  expect(saved.visibilityCondition).toEqual(original.visibilityCondition);
});

it("edits legacy documents with the standard limits and keeps the document link", async () => {
  const saved = await saveField({
    ...existing,
    type: "DOCUMENT",
    workflowDocument: {
      stableKey: "LINKED_EVIDENCE",
      acceptedFileTypes: ["PDF"],
      maximumSizeMb: 6,
      expiryDays: null,
      requestOnStageActivation: false,
      uploader: "STAFF",
      verifier: "STAFF",
      templateReference: "",
    },
  });
  expect(saved.uploadedBy).toBe("ANY");
  expect(saved.acceptedExtensions).toEqual([".pdf"]);
  expect(saved.maximumFileSizeMb).toBe(6);
  expect(saved.workflowDocument?.stableKey).toBe("LINKED_EVIDENCE");
});

it("offers and saves an explicit Comment field", async () => {
  const field = await saveField(undefined, "COMMENT");
  expect(field.type).toBe("COMMENT");
});
