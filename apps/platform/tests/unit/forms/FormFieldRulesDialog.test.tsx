// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormFieldRulesDialog } from "@/modules/forms/ui/builder/FormFieldRulesDialog";
import { condition, definition } from "../../support/FormFieldRuleFixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("field validation rules dialog", () => {
  it("shows the rule controls and saves their configuration", async () => {
    const form = definition({
      validationCondition: condition("AMOUNT", 10),
      editableCondition: condition("ENABLED"),
      requiredCondition: condition("ENABLED"),
      validationSettings: {
        message: "Amount must equal ten.",
        modes: ["SUBMIT"],
        missing: "REJECT",
      },
    });
    const saved = vi.fn().mockResolvedValue(undefined);
    const closed = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <FormFieldRulesDialog
            field={form.fields[1]}
            fields={form.fields}
            sections={form.sections}
            onSave={saved}
            onClose={closed}
          />,
        ),
      );
      expect(document.body.textContent).toContain("Validation Rules · Amount");
      expect(document.body.textContent).toContain("Visibility condition");
      expect(document.body.textContent).toContain("Editable when");
      expect(document.body.textContent).toContain("Required when");
      expect(document.body.textContent).toContain("Missing rule inputs");
      const message = document.querySelector<HTMLInputElement>(
        '[name="rules.validationSettings.message"]',
      )!;
      expect(message.value).toBe("Amount must equal ten.");
      await act(async () => {
        const setValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!;
        setValue.call(message, "Use the approved amount.");
        message.dispatchEvent(new Event("input", { bubbles: true }));
        message.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await act(async () =>
        document
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          ),
      );
      expect(saved).toHaveBeenCalledOnce();
      expect(saved.mock.calls[0][0].rules).toMatchObject({
        editableCondition: form.fields[1].rules!.editableCondition,
        requiredCondition: form.fields[1].rules!.requiredCondition,
        validationSettings: {
          message: "Use the approved amount.",
          modes: ["SUBMIT"],
          missing: "REJECT",
        },
      });
      expect(closed).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
