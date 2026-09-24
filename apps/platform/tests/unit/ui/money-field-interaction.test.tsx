// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";

import { MoneyField } from "@/components/ui/money-field";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

function MoneyForm() {
  const form = useForm<{ amount: number }>({
    defaultValues: { amount: 0 },
  });
  const amount = useWatch({ control: form.control, name: "amount" });
  return (
    <FormProvider {...form}>
      <MoneyField label="Amount" name="amount" />
      <output>{amount}</output>
    </FormProvider>
  );
}

function PersistedMoneyForm({ amount }: { amount: string }) {
  const form = useForm<{ amount: string }>({
    defaultValues: { amount },
  });
  return (
    <FormProvider {...form}>
      <MoneyField label="Amount" name="amount" />
    </FormProvider>
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("money field interaction", () => {
  it("renders an initial zero as an empty input", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<MoneyForm />));

    expect(container.querySelector<HTMLInputElement>("input")?.value).toBe("");
    expect(container.querySelector("output")?.textContent).toBe("0");
    await act(async () => root.unmount());
  });

  it("groups a persisted decimal value after the form mounts", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<PersistedMoneyForm amount="15000000.00" />);
    });

    expect(container.querySelector<HTMLInputElement>("input")?.value).toBe(
      "15,000,000",
    );
    await act(async () => root.unmount());
  });

  it("groups typed digits while retaining a numeric form value", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<MoneyForm />));
    const input = container.querySelector<HTMLInputElement>("input");

    await act(async () => {
      if (!input) return;
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(input, "1234567.89");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(input?.value).toBe("1,234,567.89");
    expect(container.querySelector("output")?.textContent).toBe("1234567.89");
    await act(async () => root.unmount());
  });
});
