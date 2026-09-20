// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { additionalOperators } from "@/modules/conditions/engine/AdditionalOperators";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { ConditionBuilder } from "@/modules/conditions/ui/builder";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const fields = [
  {
    key: "application.requested_amount",
    label: "Requested amount",
    type: "NUMBER" as const,
  },
  {
    key: "application.sector",
    label: "Sector",
    type: "TEXT" as const,
  },
];

function definition(value: number): ConditionGroup {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    kind: "GROUP",
    combinator: "AND",
    children: [{
      id: "30000000-0000-4000-8000-000000000002",
      kind: "CONDITION",
      leftOperand: { kind: "FIELD", key: fields[0].key },
      operator: basicOperators.EQUALS,
      rightOperand: { kind: "CONSTANT", value },
    }],
  };
}

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("ConditionBuilder", () => {
  it("renders an existing definition and reloads replacement values", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const onChange = vi.fn();

    await act(async () => root?.render(
      <ConditionBuilder
        fields={fields}
        onChange={onChange}
        value={definition(100_000)}
      />,
    ));
    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="Field"]',
    )?.value).toBe("application.requested_amount");
    expect(container.querySelector<HTMLInputElement>(
      '[aria-label="Value"]',
    )?.value).toBe("100000");

    await act(async () => root?.render(
      <ConditionBuilder
        fields={fields}
        onChange={onChange}
        value={{ ...definition(250_000), combinator: "OR" }}
      />,
    ));

    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="Group match"]',
    )?.value).toBe("OR");
    expect(container.querySelector<HTMLInputElement>(
      '[aria-label="Value"]',
    )?.value).toBe("250000");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits condition, group, nested group, and combinator edits", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const changes: ConditionGroup[] = [];
    let current: ConditionGroup = {
      id: "40000000-0000-4000-8000-000000000001",
      kind: "GROUP",
      combinator: "AND",
      children: [],
    };
    const generatedIds = [
      "40000000-0000-4000-8000-000000000002",
      "40000000-0000-4000-8000-000000000003",
      "40000000-0000-4000-8000-000000000004",
    ];
    const render = () => root?.render(
      <ConditionBuilder
        createId={() => generatedIds.shift()!}
        fields={fields}
        onChange={(next) => {
          current = next;
          changes.push(next);
          render();
        }}
        value={current}
      />,
    );
    await act(async () => render());

    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Add condition"]',
    )?.click());

    const fieldSelect = container.querySelector<HTMLSelectElement>(
      '[aria-label="Field"]',
    );
    await act(async () => {
      if (!fieldSelect) return;
      fieldSelect.value = "application.sector";
      fieldSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const operatorSelect = container.querySelector<HTMLSelectElement>(
      '[aria-label="Operator"]',
    );
    await act(async () => {
      if (!operatorSelect) return;
      operatorSelect.value = additionalOperators.IN;
      operatorSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const valueList = container.querySelector<HTMLInputElement>(
      '[aria-label="Value list"]',
    );
    await act(async () => {
      if (!valueList) return;
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(valueList, "Agriculture, Manufacturing");
      valueList.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => container.querySelector<HTMLButtonElement>(
      '[aria-label="Add group"]',
    )?.click());

    const nestedGroup = container.querySelector<HTMLDivElement>(
      '.ruleGroup[data-level="1"]',
    );
    const nestedCombinator = nestedGroup?.querySelector<HTMLSelectElement>(
      '[aria-label="Group match"]',
    );
    await act(async () => {
      if (!nestedCombinator) return;
      nestedCombinator.value = "OR";
      nestedCombinator.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const nestedAddGroup = nestedGroup?.querySelector<HTMLButtonElement>(
      '[aria-label="Add group"]',
    );
    await act(async () => nestedAddGroup?.click());

    expect(changes.length).toBe(7);
    expect(current.children[0]).toMatchObject({
      kind: "CONDITION",
      leftOperand: { kind: "FIELD", key: "application.sector" },
      operator: additionalOperators.IN,
      rightOperand: {
        kind: "CONSTANT",
        value: ["Agriculture", "Manufacturing"],
      },
    });
    expect(current.children[1]).toMatchObject({
      kind: "GROUP",
      combinator: "OR",
      children: [{ kind: "GROUP" }],
    });
  });
});
