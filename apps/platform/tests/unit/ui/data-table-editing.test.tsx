// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

type RecordRow = { id: string; name: string; amount: number; locked?: boolean };
const data: RecordRow[] = [
  { id: "b", name: "Zulu", amount: 2 },
  { id: "a", name: "Alpha", amount: 1, locked: true },
];
const columns: DataTableColumn<RecordRow>[] = [
  { accessorKey: "id", header: "Reference" },
  {
    accessorKey: "name",
    header: "Name",
    editor: {
      label: "Name",
      schema: z.string().trim().min(1, "Name is required"),
      canEdit: (row) => !row.locked,
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    editor: {
      label: "Amount",
      schema: z
        .string()
        .regex(/^\d+$/, "Enter a whole number")
        .transform(Number),
      inputType: "number",
    },
  },
];

let root: Root;
let container: HTMLDivElement;

async function mount(onCellEdit = vi.fn(), configuredColumns = columns) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <DataTable
        columns={configuredColumns}
        data={data}
        rowKey={(row) => row.id}
        onCellEdit={onCellEdit}
        renderExpandedRow={(row) => <p>Details for {row.id}</p>}
      />,
    );
  });
  return onCellEdit;
}

async function click(label: string) {
  const button = container.querySelector<HTMLButtonElement>(
    `[aria-label="${label}"]`,
  );
  expect(button).not.toBeNull();
  await act(async () => button?.click());
}

async function change(value: string, selector = "input") {
  const field = container.querySelector<HTMLInputElement>(selector);
  expect(field).not.toBeNull();
  await act(async () => {
    const prototype =
      selector === "select"
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
      field,
      value,
    );
    field?.dispatchEvent(
      new Event(selector === "select" ? "change" : "input", { bubbles: true }),
    );
  });
}

async function submit() {
  await act(async () => {
    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

afterEach(async () => {
  if (root) {
    await act(async () => root.unmount());
  }
  document.body.replaceChildren();
});

describe("DataTable cell editing", () => {
  it("only enables configured columns and eligible rows", async () => {
    await mount();
    expect(container.querySelectorAll('[aria-label="Edit Name"]')).toHaveLength(
      1,
    );
    expect(
      container.querySelectorAll('[aria-label="Edit Amount"]'),
    ).toHaveLength(2);
    expect(container.querySelector('[aria-label="Edit Reference"]')).toBeNull();
    expect(container.querySelector("tbody tr td:nth-child(2)")?.className).toContain("h-10");
    expect(container.querySelector('[role="region"]')?.className).toContain(
      "overflow-x-auto",
    );
  });

  it("keeps configured cells read only when no save callback is provided", async () => {
    await mount();
    await act(async () =>
      root.render(<DataTable columns={columns} data={data} />),
    );
    expect(container.querySelector('[aria-label="Edit Name"]')).toBeNull();
  });

  it("validates and saves the original row identity after sorting", async () => {
    const save = await mount();
    await act(async () => {
      Array.from(container.querySelectorAll("thead button"))
        .find((button) => button.textContent === "Name")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector("tbody tr")?.textContent).toContain("Alpha");
    await click("Edit Name");
    await change(" ");
    await submit();
    expect(save).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Name is required",
    );
    await change(" Updated ");
    await submit();
    expect(save).toHaveBeenCalledExactlyOnceWith({
      row: data[0],
      rowId: "b",
      columnId: "name",
      previousValue: "Zulu",
      value: "Updated",
    });
    expect(container.querySelector("form")).toBeNull();
    await click("Expand row");
    expect(container.textContent).toContain("Details for a");
  });

  it("cancels through Escape and does not save unchanged values", async () => {
    const save = await mount();
    await click("Edit Name");
    await change("Discard");
    await act(async () => {
      container
        .querySelector("input")
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
    });
    expect(container.querySelector("form")).toBeNull();
    await click("Edit Name");
    await submit();
    expect(save).not.toHaveBeenCalled();
    expect(container.querySelector("form")).toBeNull();
  });

  it("preserves failed edits for retry and transforms numeric values", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("Save failed"))
      .mockResolvedValue(undefined);
    await mount(save);
    await click("Edit Amount");
    await change("12");
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Save failed",
    );
    expect(container.querySelector<HTMLInputElement>("input")?.value).toBe(
      "12",
    );
    await submit();
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ rowId: "b", value: 12 }),
    );
    expect(container.querySelector("form")).toBeNull();
  });

  it("disables editing controls while an asynchronous save is pending", async () => {
    let finish: () => void = () => {};
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await mount(save);
    await click("Edit Name");
    await change("Saved");
    await submit();
    expect(container.querySelector<HTMLInputElement>("input")?.disabled).toBe(
      true,
    );
    expect(
      container.querySelector<HTMLButtonElement>('[aria-label="Save Name"]')
        ?.disabled,
    ).toBe(true);
    await submit();
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(container.querySelector("form")).toBeNull();
  });

  it("uses the shared select for columns with fixed choices", async () => {
    const choices = columns.map((column) =>
      "accessorKey" in column && column.accessorKey === "name"
        ? {
            ...column,
            editor: {
              label: "Name",
              schema: z.enum(["Zulu", "Bravo"]),
              options: [
                { label: "Zulu", value: "Zulu" },
                { label: "Bravo", value: "Bravo" },
              ],
            },
          }
        : column,
    );
    const save = await mount(vi.fn(), choices);
    await click("Edit Name");
    await change("Bravo", "select");
    await submit();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ value: "Bravo" }),
    );
  });
});
