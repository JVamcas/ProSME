// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
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
    key: "application.annual_turnover",
    label: "Annual turnover",
    type: "NUMBER" as const,
  },
  {
    key: "fundingCall.maximum_amount",
    label: "Maximum amount",
    type: "NUMBER" as const,
  },
];

const computed: ConditionGroup = {
  id: "35000000-0000-4000-8000-000000000001",
  kind: "GROUP",
  combinator: "AND",
  children: [{
    id: "35000000-0000-4000-8000-000000000002",
    kind: "CONDITION",
    leftOperand: {
      kind: "COMPUTED",
      leftOperand: {
        key: "application.requested_amount",
        kind: "FIELD",
      },
      operation: "DIVIDE",
      rightOperand: {
        key: "application.annual_turnover",
        kind: "FIELD",
      },
    },
    operator: basicOperators.LESS_THAN_OR_EQUAL,
    rightOperand: {
      key: "fundingCall.maximum_amount",
      kind: "FIELD",
    },
  }],
};

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("ConditionBuilder operands", () => {
  it("renders field and computed operands without flattening them", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(
      <ConditionBuilder
        fields={fields}
        onChange={() => undefined}
        value={computed}
      />,
    ));

    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="Field type"]',
    )?.value).toBe("COMPUTED");
    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="First numeric operand"]',
    )?.value).toBe("application.requested_amount");
    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="Calculation"]',
    )?.value).toBe("DIVIDE");
    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="Second numeric operand"]',
    )?.value).toBe("application.annual_turnover");
    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="Value type"]',
    )?.value).toBe("FIELD");
    expect(container.querySelector<HTMLSelectElement>(
      '[aria-label="Value"]',
    )?.value).toBe("fundingCall.maximum_amount");
    expect(container.textContent).toContain(
      "(Requested amount ÷ Annual turnover) Less than or equal Maximum amount",
    );
  });
});
