// @vitest-environment happy-dom

import { getLocalTimeZone, today } from "@internationalized/date";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { FormProvider, useForm } from "react-hook-form";

import { FormDateInput } from "@/shared/ui/FormDateInput";
import { FormDateTimeInput } from "@/shared/ui/FormDateTimeInput";

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
      root.render(
        <FormDateInput
          label="Date of birth"
          name="dateOfBirth"
          size="compact"
        />,
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="Open calendar"]',
    );
    expect(trigger?.classList.contains("size-6")).toBe(true);
    expect(trigger?.parentElement?.classList.contains("h-8")).toBe(true);

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
  it("preserves the selected time when choosing Today", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<SavedDateTimeForm />));
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Open calendar"]')
        ?.click();
    });
    await act(async () => {
      [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
        .find((button) => button.textContent === "Today")
        ?.click();
    });
    const input = container.querySelector<HTMLInputElement>(
      'input[name="opensAt"]',
    );
    expect(input?.value).toBe(`${today(getLocalTimeZone())}T14:30:00`);
    await act(async () => root.unmount());
  });

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
