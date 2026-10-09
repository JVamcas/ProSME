// @vitest-environment happy-dom

import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  FormProvider,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportParameterTable } from "@/modules/reporting/ui/definitions/ReportParameterTable";
import {
  reportTemplateInputSchema,
  type ReportTemplateInput,
} from "@/modules/reporting/api/ReportManagementSchemas";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";

vi.mock("@/shared/ui/Toast", () => ({ toast: { error: vi.fn() } }));
import { toast } from "@/shared/ui/Toast";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
const initial: ReportTemplateInput = {
  ...applicationExportTemplate,
  definition: {
    ...applicationExportTemplate.definition,
    parameters: applicationExportTemplate.definition.parameters.slice(0, 2),
  },
};

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.clearAllMocks();
});

async function renderTable(disabled = false, input = initial) {
  const changed = vi.fn();
  const parentSubmit = vi.fn((event: React.FormEvent) =>
    event.preventDefault(),
  );
  function Harness() {
    const form = useForm<ReportTemplateInput>({
      resolver: zodResolver(
        reportTemplateInputSchema,
      ) as Resolver<ReportTemplateInput>,
      defaultValues: input,
    });
    const values = useWatch({
      control: form.control,
      name: "definition.parameters",
    });
    useEffect(() => changed(values), [values]);
    return (
      <FormProvider {...form}>
        <form onSubmit={parentSubmit}>
          <ReportParameterTable disabled={disabled} />
        </form>
      </FormProvider>
    );
  }
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<Harness />));
  return {
    container,
    parentSubmit,
    latest: () => changed.mock.calls.at(-1)![0],
  };
}

async function click(text: string) {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find((item) => item.textContent?.trim() === text);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

async function changeInput(name: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(
    `[role="dialog"] [name="${name}"]`,
  )!;
  expect(input).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submitDialog() {
  await act(async () =>
    document
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

describe("parameter table and row dialog", () => {
  it("shows compact rows and discards edits on Cancel without submitting the template", async () => {
    const { container, parentSubmit, latest } = await renderTable();
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(container.textContent).toContain("startDate");
    await click("Edit");
    await changeInput("name", "changedDate");
    await click("Cancel");
    expect(latest()).toEqual(initial.definition.parameters);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(parentSubmit).not.toHaveBeenCalled();
  });

  it("edits a row and appends a parameter only when the dialog saves", async () => {
    const { parentSubmit, latest } = await renderTable();
    await click("Edit");
    await changeInput("name", "lodgedDate");
    await submitDialog();
    expect(latest()[0].name).toBe("lodgedDate");
    expect(latest()[0].position).toBe(1);
    await click("Add parameter");
    await changeInput("name", "fundingCall");
    await submitDialog();
    expect(latest()).toHaveLength(3);
    expect(latest()[2]).toMatchObject({
      name: "fundingCall",
      position: 3,
      type: "text",
    });
    expect(parentSubmit).not.toHaveBeenCalled();
  });

  it("rejects duplicate names through the row resolver and existing toast", async () => {
    const { latest } = await renderTable();
    await click("Add parameter");
    await changeInput("name", "startDate");
    await submitDialog();
    expect(latest()).toHaveLength(2);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      "Check the highlighted parameter fields.",
    );
  });

  it("removes a row and renumbers the remaining SQL positions", async () => {
    const { latest } = await renderTable();
    await click("Remove");
    expect(latest()).toHaveLength(1);
    expect(latest()[0]).toMatchObject({ name: "endDate", position: 1 });
  });

  it("preserves a false default on edit and can remove the default explicitly", async () => {
    const input = {
      ...initial,
      definition: {
        ...initial.definition,
        parameters: [
          {
            ...initial.definition.parameters[0],
            type: "boolean" as const,
            defaultValue: false,
          },
        ],
      },
    };
    const { latest } = await renderTable(false, input);
    await click("Edit");
    await submitDialog();
    expect(latest()[0].defaultValue).toBe(false);
    await click("Edit");
    await act(async () =>
      document.querySelector<HTMLInputElement>('[name="hasDefault"]')!.click(),
    );
    await submitDialog();
    expect(latest()[0]).not.toHaveProperty("defaultValue");
  });

  it("sets the required type when choosing a server binding", async () => {
    const { latest } = await renderTable();
    await click("Add parameter");
    await changeInput("name", "runAt");
    const binding = document.querySelector<HTMLSelectElement>(
      '[role="dialog"] [name="binding"]',
    )!;
    await act(async () => {
      binding.value = "run-at";
      binding.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(
      document.querySelector<HTMLSelectElement>(
        '[role="dialog"] [name="type"]',
      )!.disabled,
    ).toBe(true);
    await submitDialog();
    expect(latest()[2]).toMatchObject({
      name: "runAt",
      binding: "run-at",
      type: "timestamp",
    });
    expect(latest()[2]).not.toHaveProperty("defaultValue");
  });

  it("disables all row mutations for a read-only template", async () => {
    const { container, latest } = await renderTable(true);
    const actions = [
      ...container.querySelectorAll<HTMLButtonElement>("button"),
    ].filter((item) =>
      ["Add parameter", "Edit", "Remove"].includes(
        item.textContent?.trim() ?? "",
      ),
    );
    expect(actions).toHaveLength(5);
    expect(actions.every((button) => button.disabled)).toBe(true);
    await click("Add parameter");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(latest()).toHaveLength(2);
  });
});
