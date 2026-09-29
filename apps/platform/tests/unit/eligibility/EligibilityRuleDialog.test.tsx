// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EligibilityRuleDialog } from "@/modules/eligibility/ui/EligibilityRuleDialog";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const question = {
  applicantLabel: "Have you completed matric?",
  code: "MATRIC_COMPLETED",
  id: "70000000-0000-4000-8000-000000000015",
  inputType: "BOOLEAN" as const,
  reviewerLabel: "Has applicant completed matric?",
};

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

async function renderDialog() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const onSave = vi.fn().mockResolvedValue(undefined);
  await act(async () => root?.render(
    <EligibilityRuleDialog
      fields={[]}
      nextOrder={1}
      onCancel={() => undefined}
      onSave={onSave}
      questions={[question]}
      saving={false}
    />,
  ));
  await changeSelect(container, '[name="questionId"]', question.id);
  return { container, onSave };
}

async function changeSelect(
  container: HTMLElement,
  selector: string,
  value: string,
) {
  const select = container.querySelector<HTMLSelectElement>(selector);
  expect(select).not.toBeNull();
  await act(async () => {
    select!.value = value;
    select!.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function fillMetadata(container: HTMLElement) {
  for (const [name, value] of [
    ["reasonCode", "MATRIC_REQUIRED"],
    ["applicantMessage", "You need a grade 12 certificate to qualify."],
  ]) {
    const input = container.querySelector<HTMLInputElement>(`[name="${name}"]`);
    expect(input).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
        ?.set?.call(input, value);
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
}

async function submit(container: HTMLElement) {
  await act(async () => container.querySelector("form")?.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  ));
}

describe("EligibilityRuleDialog condition validation", () => {
  it.each([true, false])("saves a boolean condition with value %s", async (value) => {
    const { container, onSave } = await renderDialog();
    expect(container.textContent).toContain(
      "Condition groups must contain at least one condition.",
    );
    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Add condition"]',
    )?.click());

    expect(container.textContent).not.toContain("Value must be true or false.");
    expect(container.textContent).not.toContain(
      "Condition groups must contain at least one condition.",
    );
    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="Value"]',
    )?.value).toBe("true");
    if (!value) {
      await changeSelect(container, '[aria-label="Value"]', "false");
    }
    await fillMetadata(container);
    await submit(container);

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].condition.children[0]).toMatchObject({
      leftOperand: { kind: "FIELD", key: "eligibility.MATRIC_COMPLETED" },
      rightOperand: { kind: "CONSTANT", value },
    });
  });

  it("revalidates removal and prevents saving an empty group", async () => {
    const { container, onSave } = await renderDialog();
    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Add condition"]',
    )?.click());
    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Remove condition"]',
    )?.click());

    expect(container.textContent).toContain(
      "Condition groups must contain at least one condition.",
    );
    await fillMetadata(container);
    await submit(container);
    expect(onSave).not.toHaveBeenCalled();
  });
});
