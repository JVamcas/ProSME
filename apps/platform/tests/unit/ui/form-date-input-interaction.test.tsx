// @vitest-environment happy-dom

import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { FormDateInput, type FormDateInputProps } from "@/shared/ui/FormDateInput";
import { FormDateTimeInput } from "@/shared/ui/FormDateTimeInput";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

function SavedForm({
  withTime = false,
  initialValue = "2026-09-15",
  ...props
}: Partial<FormDateInputProps> & { initialValue?: string; withTime?: boolean }) {
  const form = useForm({
    defaultValues: { selectedDate: initialValue },
    resolver: zodResolver(
      z.object({ selectedDate: z.string().min(1, "Choose a date") }),
    ),
  });
  const value = useWatch({ control: form.control, name: "selectedDate" });
  const Picker = withTime ? FormDateTimeInput : FormDateInput;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)}>
        <Picker label="Selected date" name="selectedDate" {...props} />
        <output data-value>{value}</output>
        <output data-dirty>
          {String(Boolean(form.formState.dirtyFields.selectedDate))}
        </output>
        <output data-touched>
          {String(Boolean(form.formState.touchedFields.selectedDate))}
        </output>
        <button
          data-reset
          onClick={() => form.reset({ selectedDate: "2026-10-01" })}
          type="button"
        >
          Reset date
        </button>
      </form>
    </FormProvider>
  );
}

async function render(element: ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(element));
  return container;
}

function visibleInput(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input:not([type="hidden"])');
  expect(input).not.toBeNull();
  return input!;
}

function savedValue(container: HTMLElement) {
  return container.querySelector<HTMLInputElement>('input[type="hidden"]')?.value;
}

async function openCalendar(container: HTMLElement) {
  await act(async () => visibleInput(container).click());
}

async function clickFooter(label: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>(".ant-picker-footer button")]
    .find((candidate) => candidate.textContent === label);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await act(async () => root.unmount());
  }
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("Ant Design form date input", () => {
  it("displays the saved form value and responds to reset", async () => {
    const container = await render(<SavedForm />);
    expect(savedValue(container)).toBe("2026-09-15");
    expect(visibleInput(container).value).toBe("15/09/2026");
    expect(container.querySelector("label")?.htmlFor).toBe(visibleInput(container).id);

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-reset]")!.click();
    });
    expect(savedValue(container)).toBe("2026-10-01");
    expect(visibleInput(container).value).toBe("01/10/2026");
  });

  it("selects a calendar date and updates form state", async () => {
    const onChange = vi.fn();
    const container = await render(<SavedForm onChangeValue={onChange} />);
    await openCalendar(container);

    const cell = document.querySelector<HTMLElement>('[title="2026-09-16"] .ant-picker-cell-inner');
    expect(cell).not.toBeNull();
    await act(async () => cell!.click());

    expect(savedValue(container)).toBe("2026-09-16");
    expect(container.querySelector("[data-value]")?.textContent).toBe("2026-09-16");
    expect(container.querySelector("[data-dirty]")?.textContent).toBe("true");
    expect(container.querySelector("[data-touched]")?.textContent).toBe("true");
    expect(onChange).toHaveBeenCalledWith("2026-09-16");
  });

  it("clears a date and exposes schema validation", async () => {
    const container = await render(<SavedForm required />);
    await openCalendar(container);
    await clickFooter("Clear");
    expect(savedValue(container)).toBe("");
    expect(container.querySelector("[data-value]")?.textContent).toBe("");
    expect(container.textContent).toContain("Choose a date");
    expect(visibleInput(container).getAttribute("aria-invalid")).toBe("true");
    expect(visibleInput(container).required).toBe(true);
    expect(visibleInput(container).getAttribute("aria-describedby"))
      .toBe("selectedDate-error");
  });

  it("disables dates outside the allowed range", async () => {
    const container = await render(
      <SavedForm size="compact" minValue="2026-09-15" maxValue="2026-09-17" />,
    );
    expect(container.querySelector(".ant-picker")).not.toBeNull();
    await openCalendar(container);
    const disabled = document.querySelector<HTMLElement>('[title="2026-09-14"]');
    expect(disabled?.classList.contains("ant-picker-cell-disabled")).toBe(true);
    await act(async () => disabled?.querySelector<HTMLElement>(".ant-picker-cell-inner")?.click());
    expect(savedValue(container)).toBe("2026-09-15");
    expect(document.querySelector<HTMLElement>('[title="2026-09-18"]')?.classList
      .contains("ant-picker-cell-disabled")).toBe(true);
  });

  it.each(["readOnly", "disabled"] as const)("prevents edits when %s", async (state) => {
    const container = await render(<SavedForm {...{ [state]: true }} />);
    await openCalendar(container);
    expect(document.querySelector(".ant-picker-panel")).toBeNull();
    expect(savedValue(container)).toBe("2026-09-15");
    if (state === "disabled") {
      expect(visibleInput(container).disabled).toBe(true);
    } else {
      expect(visibleInput(container).readOnly).toBe(true);
      expect(container.querySelector(".ant-picker-clear")).toBeNull();
    }
  });

  it("supports standalone controlled values, description and focus callbacks", async () => {
    const onBlur = vi.fn();
    const onFocus = vi.fn();
    const onChange = vi.fn();
    const container = await render(
      <FormDateInput
        description="Use the project start date"
        label="Project date"
        name="projectDate"
        onBlurValue={onBlur}
        onChangeValue={onChange}
        onFocusValue={onFocus}
        value="2026-09-15"
      />,
    );
    const input = visibleInput(container);
    expect(input.getAttribute("aria-describedby")).toBe("projectDate-description");
    await act(async () => input.focus());
    expect(onFocus).toHaveBeenCalledWith("2026-09-15");
    await act(async () => input.blur());
    expect(onBlur).toHaveBeenCalledWith("2026-09-15");
    await openCalendar(container);
    await clickFooter("Clear");
    expect(onChange).toHaveBeenCalledWith("");
    expect(savedValue(container)).toBe("2026-09-15");
  });
});

describe("Ant Design form date-time input", () => {
  it("starts a new date-time at midnight without hidden seconds", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 15, 9, 15, 37));
    const container = await render(<SavedForm initialValue="" withTime />);
    await openCalendar(container);
    const cell = document.querySelector<HTMLElement>(
      '[title="2026-09-16"] .ant-picker-cell-inner',
    );
    expect(cell).not.toBeNull();
    await act(async () => cell!.click());
    await act(async () => {
      document.querySelector<HTMLButtonElement>(".ant-picker-ok button")!.click();
    });
    expect(savedValue(container)).toBe("2026-09-16T00:00:00");
  });

  it("displays the saved local time using a 24-hour format", async () => {
    const container = await render(<SavedForm initialValue="2026-09-15T14:30" withTime />);
    expect(savedValue(container)).toBe("2026-09-15T14:30");
    expect(visibleInput(container).value).toBe("15/09/2026 14:30");
    await openCalendar(container);
    expect(document.querySelectorAll(".ant-picker-time-panel-column")).toHaveLength(2);
  });

  it("preserves the selected time when choosing Today", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 9, 9, 15));
    const container = await render(<SavedForm initialValue="2026-09-15T14:30" withTime />);
    await openCalendar(container);
    await clickFooter("Today");
    expect(savedValue(container)).toBe(`${dayjs().format("YYYY-MM-DD")}T14:30:00`);
    expect(container.querySelector("[data-value]")?.textContent).toBe("2026-10-09T14:30:00");
  });

  it("saves a changed time when confirmed", async () => {
    const container = await render(<SavedForm initialValue="2026-09-15T14:30" withTime />);
    await openCalendar(container);
    const columns = document.querySelectorAll(".ant-picker-time-panel-column");
    await act(async () => {
      columns[0]!.querySelectorAll<HTMLElement>("li")[15]!
        .querySelector<HTMLElement>(".ant-picker-time-panel-cell-inner")!.click();
    });
    await act(async () => {
      columns[1]!.querySelectorAll<HTMLElement>("li")[45]!
        .querySelector<HTMLElement>(".ant-picker-time-panel-cell-inner")!.click();
    });
    await act(async () => {
      document.querySelector<HTMLButtonElement>(".ant-picker-ok button")!.click();
    });
    expect(savedValue(container)).toBe("2026-09-15T15:45:00");
    expect(container.querySelector("[data-value]")?.textContent).toBe("2026-09-15T15:45:00");
  });

  it("restricts hours and minutes on boundary days", async () => {
    const container = await render(
      <SavedForm
        initialValue="2026-09-15T14:30"
        maxValue="2026-09-15T16:45"
        minValue="2026-09-15T14:15"
        withTime
      />,
    );
    await openCalendar(container);
    const columns = document.querySelectorAll(".ant-picker-time-panel-column");
    const hours = columns[0]?.querySelectorAll("li");
    const minutes = columns[1]?.querySelectorAll("li");
    expect(hours?.[13]?.classList.contains("ant-picker-time-panel-cell-disabled")).toBe(true);
    expect(hours?.[14]?.classList.contains("ant-picker-time-panel-cell-disabled")).toBe(false);
    expect(hours?.[17]?.classList.contains("ant-picker-time-panel-cell-disabled")).toBe(true);
    expect(minutes?.[14]?.classList.contains("ant-picker-time-panel-cell-disabled")).toBe(true);
    expect(minutes?.[15]?.classList.contains("ant-picker-time-panel-cell-disabled")).toBe(false);
  });

  it("disables Today when the preserved time exceeds a boundary", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 15, 9, 15));
    const container = await render(
      <SavedForm initialValue="2026-09-14T14:30" maxValue="2026-09-15T12:00" withTime />,
    );
    await openCalendar(container);
    const today = [...document.querySelectorAll<HTMLButtonElement>(".ant-picker-footer button")]
      .find((button) => button.textContent === "Today");
    expect(today?.disabled).toBe(true);
  });
});
