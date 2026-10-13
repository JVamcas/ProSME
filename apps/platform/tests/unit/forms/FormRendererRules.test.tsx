// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { condition, definition } from "../../support/FormFieldRuleFixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("renderer rule enforcement", () => {
  it.each(["DRAFT", "SUBMIT"] as const)(
    "honors %s-only validation during submission",
    async (mode) => {
      const form = definition({
        editableCondition: condition("ENABLED"),
        validationCondition: condition("AMOUNT", 10),
        validationSettings: {
          message: "Amount must equal ten.",
          modes: [mode],
          missing: "REJECT",
        },
      });
      const submitted = vi.fn();
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () =>
          root.render(
            <FormRenderer
              definition={form}
              formData={{ ENABLED: true, AMOUNT: 5 }}
              onChange={vi.fn()}
              onSubmit={submitted}
            >
              <button type="submit">Submit</button>
            </FormRenderer>,
          ),
        );
        await act(async () =>
          container
            .querySelector("form")!
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            ),
        );
        if (mode === "SUBMIT") {
          expect(submitted).not.toHaveBeenCalled();
          expect(container.textContent).toContain("Amount must equal ten.");
        } else {
          expect(submitted).toHaveBeenCalledOnce();
        }
      } finally {
        await act(async () => root.unmount());
        container.remove();
      }
    },
  );

  it("disables a field while its edit condition is false", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <FormRenderer
            definition={definition({ editableCondition: condition("ENABLED") })}
            formData={{ ENABLED: false, AMOUNT: 10 }}
            onChange={vi.fn()}
            onSubmit={vi.fn()}
          />,
        ),
      );
      expect(
        container.querySelector<HTMLInputElement>('[name="root_AMOUNT"]')!
          .disabled,
      ).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
