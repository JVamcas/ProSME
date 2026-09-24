// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import { FormDateInput } from "@/components/ui/form-date-input";
import { FormDateTimeInput } from "@/components/ui/form-date-time-input";

function SavedDateForm() {
  const form = useForm({
    defaultValues: { projectStartDate: "2026-09-15" },
  });
  return (
    <FormProvider {...form}>
      <FormDateInput label="Project start date" name="projectStartDate" />
    </FormProvider>
  );
}

function SavedDateTimeForm() {
  const form = useForm({
    defaultValues: { opensAt: "2026-09-15T14:30" },
  });
  return (
    <FormProvider {...form}>
      <FormDateTimeInput label="Opening date and time" name="opensAt" />
    </FormProvider>
  );
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("form date input", () => {
  it("displays the saved React Hook Form value", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SavedDateForm />);
    });

    const input = container.querySelector<HTMLInputElement>(
      'input[name="projectStartDate"]',
    );
    expect(input?.value).toBe("2026-09-15");
    expect(container.textContent).toContain("15");
    expect(container.textContent).toContain("09");
    expect(container.textContent).toContain("2026");
    await act(async () => root.unmount());
  });

  it("opens an accessible calendar popover", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FormDateInput label="Date of birth" name="dateOfBirth" />);
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="Open calendar"]',
    );

    await act(async () => {
      trigger?.click();
    });

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Clear");
    expect(document.body.textContent).toContain("Today");

    await act(async () => root.unmount());
  });
});

describe("form date-time input", () => {
  it("displays the saved React Hook Form date and time", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<SavedDateTimeForm />);
    });

    const input = container.querySelector<HTMLInputElement>(
      'input[name="opensAt"]',
    );
    expect(input?.value).toBe("2026-09-15T14:30");
    expect(container.textContent).toContain("15");
    expect(container.textContent).toContain("09");
    expect(container.textContent).toContain("2026");
    expect(container.textContent).toContain("14");
    expect(container.textContent).toContain("30");

    await act(async () => root.unmount());
  });
});
