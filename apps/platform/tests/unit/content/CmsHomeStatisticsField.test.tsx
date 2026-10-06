// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ArrayFieldClientProps, BlocksField, FormState, GroupField } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const editor = vi.hoisted(() => ({
  fields: {} as FormState,
  items: [
    { value: "7", label: "Funding Calls" },
    { value: "14", label: "Regions Covered" },
    { value: "N$50,000–N$100,000", label: "Grant Range" },
    { value: "200+", label: "MSMEs Targeted" },
  ],
  loading: false,
  error: false,
  disabled: false,
  savedItems: [] as unknown[],
  addFieldRow: vi.fn(),
  nativeArray: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useFormFields: (selector: (state: [FormState]) => unknown) =>
    selector([editor.fields]),
  useForm: () => ({
    addFieldRow: editor.addFieldRow,
    disabled: editor.disabled,
    getDataByPath: () => editor.savedItems,
  }),
  ArrayField: (props: ArrayFieldClientProps) => {
    editor.nativeArray(props);
    return <div data-native-array />;
  },
}));
vi.mock("@/modules/content/ui/admin/useHomeImpactPreview", () => ({
  useHomeImpactPreview: () => ({
    items: editor.items,
    statisticsLoading: editor.loading,
    statisticsError: editor.error,
  }),
}));

import { CmsHomeStatisticsField } from "@/modules/content/ui/admin/CmsHomeStatisticsField";
import { homePageAdditionalFields } from "@/payload/fields/HomePageListsFields";

const group = homePageAdditionalFields[0] as GroupField;
const layout = group.fields.find(
  (field) => "name" in field && field.name === "layout",
) as BlocksField;
const block = layout.blocks.find(
  (block) => typeof block !== "string" && block.slug === "statistics",
);
const itemsField = typeof block === "object"
  ? block.fields.find((field) => "name" in field && field.name === "items")
  : undefined;
const path = "layout.1.items";
const props = {
  field: itemsField,
  path,
  schemaPath: "homepage.layoutstatistics.items",
  permissions: true,
} as ArrayFieldClientProps;

beforeEach(() => {
  vi.clearAllMocks();
  editor.fields = { [path]: { value: 0, rows: [], disableFormData: true } };
  editor.savedItems = [];
  editor.loading = false;
  editor.error = false;
  editor.disabled = false;
});
afterEach(() => document.body.replaceChildren());

async function renderField(overrides: Partial<ArrayFieldClientProps> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <CmsHomeStatisticsField {...props} {...overrides} />,
  ));
  return { container, root };
}

describe("Home statistics editor", () => {
  it("copies the displayed values and labels in order into the native Home array", async () => {
    const { container, root } = await renderField();
    expect(editor.addFieldRow).not.toHaveBeenCalled();
    const button = container.querySelector<HTMLButtonElement>("button");
    expect(button?.textContent).toBe("Edit displayed statistics");
    await act(async () => button?.click());

    expect(editor.addFieldRow).toHaveBeenCalledTimes(4);
    editor.items.forEach((item, rowIndex) => {
      expect(editor.addFieldRow).toHaveBeenNthCalledWith(rowIndex + 1, {
        path,
        schemaPath: props.schemaPath,
        rowIndex,
        subFieldState: {
          value: { value: item.value, initialValue: item.value, valid: true },
          label: { value: item.label, initialValue: item.label, valid: true },
        },
      });
    });
    // A second click before a rerender must not append duplicate statistics.
    editor.savedItems = editor.items;
    await act(async () => button?.click());
    expect(editor.addFieldRow).toHaveBeenCalledTimes(4);
    await act(async () => root.unmount());
  });

  it("keeps saved rows editable through the native card editor without replacing them", async () => {
    editor.fields[path].rows = [{ id: "saved" }];
    const { container, root } = await renderField({ readOnly: true });
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("[data-native-array]")).not.toBeNull();
    expect(editor.nativeArray).toHaveBeenCalledWith({ ...props, readOnly: true });
    expect(editor.addFieldRow).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it.each(["readOnly", "disabled", "loading", "error"] as const)(
    "prevents copying when %s applies",
    async (condition) => {
      if (condition !== "readOnly") editor[condition] = true;
      const { container, root } = await renderField({
        readOnly: condition === "readOnly",
      });
      const button = container.querySelector<HTMLButtonElement>("button");
      expect(button?.disabled).toBe(true);
      await act(async () => button?.click());
      expect(editor.addFieldRow).not.toHaveBeenCalled();
      await act(async () => root.unmount());
    },
  );

  it("exposes expanded statistic cards with required value and label inputs", () => {
    expect(itemsField).toMatchObject({
      type: "array",
      label: "Statistics",
      admin: {
        initCollapsed: false,
        components: {
          Field: expect.stringContaining("CmsHomeStatisticsField"),
          RowLabel: expect.stringContaining("CmsCardListRowLabel"),
        },
      },
      fields: [
        { name: "value", required: true, type: "text" },
        { name: "label", required: true, type: "text" },
      ],
    });
  });
});
