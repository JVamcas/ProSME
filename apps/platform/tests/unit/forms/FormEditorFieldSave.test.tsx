// @vitest-environment happy-dom

import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formEditorSchema } from "@/modules/forms/api/FormSchemas";
import type { FormEditorView, FormField } from "@/modules/forms/FormTypes";
import { FormFieldRulesDialog } from "@/modules/forms/ui/builder/FormFieldRulesDialog";
import { useFormEditorController } from "@/modules/forms/ui/useFormEditorController";
import { condition, definition } from "../../support/FormFieldRuleFixture";

const mocks = vi.hoisted(() => ({
  editor: vi.fn(),
  mutateAsync: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({}),
  usePathname: () => "/admin/settings/forms/test",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/modules/forms/FormHooks", () => ({
  useFormEditor: mocks.editor,
  useUpdateForm: () => ({ mutateAsync: mocks.mutateAsync }),
  useCloneForm: () => ({}),
  useFormLifecycle: () => ({}),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const runtime = definition();
const fields = runtime.fields.map((field, index) => ({
  ...field,
  id: `30000000-0000-4000-8000-00000000000${index + 1}`,
}));
const version: FormEditorView["version"] = {
  id: runtime.versionId,
  formDefinitionId: "40000000-0000-4000-8000-000000000001",
  versionNumber: 1,
  rowVersion: 7,
  status: "DRAFT",
  displayMode: "SINGLE_PAGE",
  showCompleteness: false,
  instructions: null,
  submissionMode: "EXPLICIT",
  submitLabel: "Submit",
  createdAt: "2026-10-15T10:00:00Z",
  publishedAt: null,
  retiredAt: null,
};
const editor: FormEditorView = {
  definition: {
    id: version.formDefinitionId,
    code: "REVIEW",
    name: "Review",
    description: "",
    purpose: "APPLICATION_REVIEW",
    active: true,
    updatedAt: version.createdAt,
  },
  version,
  versions: [version],
  fields,
  sections: runtime.sections,
  allowedActions: ["UPDATE"],
};
let controller: ReturnType<typeof useFormEditorController>;
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function Harness({ rules = false }: { rules?: boolean }) {
  const current = useFormEditorController(version.formDefinitionId, version.id);
  useEffect(() => {
    controller = current;
  }, [current]);
  return rules ? (
    <FormFieldRulesDialog
      field={{ ...fields[1], visibilityCondition: condition("ENABLED") }}
      fields={fields}
      sections={runtime.sections}
      onSave={current.saveField}
      onClose={vi.fn()}
    />
  ) : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.editor.mockReturnValue({ data: editor });
  mocks.mutateAsync.mockResolvedValue(editor);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function savedInput() {
  expect(mocks.mutateAsync).toHaveBeenCalledOnce();
  const input = mocks.mutateAsync.mock.calls[0][0];
  expect(formEditorSchema.safeParse(input).success).toBe(true);
  expect(input.versionId).toBe(version.id);
  expect(input.expectedRowVersion).toBe(version.rowVersion);
  expect(input.showCompleteness).toBe(false);
  return input;
}

describe("saving form fields by submitted identity", () => {
  it.each([false, true])(
    "updates rules without duplicating or replacing another field (stale edit selection: %s)",
    async (staleSelection) => {
      await act(async () => root.render(<Harness rules />));
      if (staleSelection) {
        await act(async () => controller.openExistingField(fields[0]));
      }
      await act(async () => {
        document
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
      });
      const input = savedInput();
      expect(input.fields).toHaveLength(fields.length);
      expect(input.fields[0]).toEqual(fields[0]);
      expect(input.fields[1]).toMatchObject({
        id: fields[1].id,
        key: fields[1].key,
        order: fields[1].order,
        visibilityCondition: condition("ENABLED"),
      });
      expect(
        new Set(input.fields.map((field: FormField) => field.id)).size,
      ).toBe(fields.length);
      expect(
        new Set(input.fields.map((field: FormField) => field.key)).size,
      ).toBe(fields.length);
    },
  );

  it("updates the submitted existing field even when a different field was selected", async () => {
    await act(async () => root.render(<Harness />));
    await act(async () => controller.openExistingField(fields[0]));
    await act(async () =>
      controller.saveField({ ...fields[1], label: "Updated amount" }),
    );
    const input = savedInput();
    expect(input.fields).toEqual([
      fields[0],
      { ...fields[1], label: "Updated amount" },
    ]);
  });

  it("appends a new field without overwriting a previously selected field", async () => {
    await act(async () => root.render(<Harness />));
    await act(async () => controller.openExistingField(fields[0]));
    const next: FormField = {
      ...runtime.fields[1],
      key: "NEW_AMOUNT",
      label: "New amount",
      order: 3,
    };
    await act(async () => controller.saveField(next));
    expect(savedInput().fields).toEqual([...fields, next]);
  });
});
