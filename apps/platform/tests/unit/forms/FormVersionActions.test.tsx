// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FormDefinitionSummary,
  FormVersionSummary,
} from "@/modules/forms/FormTypes";
import type { ActionMenuItem } from "@/shared/ui/ActionMenu";

const mocks = vi.hoisted(() => {
  const mutation = () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
  });
  return {
    editor: vi.fn(),
    publish: mutation(),
    retire: mutation(),
    clone: mutation(),
    push: vi.fn(),
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/modules/forms/FormHooks", () => ({
  useFormEditor: mocks.editor,
  useCloneForm: () => mocks.clone,
  useFormLifecycle: (action: "publish" | "retire") => mocks[action],
}));
vi.mock("@/shared/ui/ActionMenu", () => ({
  ActionMenu: ({
    label,
    items,
  }: {
    label: string;
    items: ActionMenuItem[];
  }) => (
    <div aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          data-action={item.id}
          disabled={item.disabled}
          onClick={item.onAction}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

import { FormsTable } from "@/modules/forms/ui/staff/FormsTable";
import { FormVersionActions } from "@/modules/forms/ui/staff/FormVersionActions";
import { useFormVersionActions } from "@/modules/forms/ui/staff/useFormVersionActions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const definitionId = "20000000-0000-4000-8000-000000000001";
const versions: FormVersionSummary[] = ["DRAFT", "PUBLISHED", "RETIRED"].map(
  (status, index) => ({
    id: `20000000-0000-4000-8000-00000000000${index + 2}`,
    formDefinitionId: definitionId,
    versionNumber: 3 - index,
    rowVersion: 9 - index,
    status: status as FormVersionSummary["status"],
    displayMode: "SINGLE_PAGE",
    instructions: null,
    submissionMode: "EXPLICIT",
    submitLabel: "Submit",
    createdAt: "2026-10-01T10:00:00Z",
    publishedAt: null,
    retiredAt: null,
  }),
);
const form: FormDefinitionSummary = {
  id: definitionId,
  code: "TEST",
  name: "Test form",
  description: "",
  purpose: "APPLICATION_REVIEW",
  active: true,
  latestVersionId: versions[0].id,
  latestVersion: 3,
  latestVersionRowVersion: 9,
  latestStatus: "DRAFT",
  sectionCount: 1,
  fieldCount: 1,
  usedByCount: 0,
  updatedAt: "2026-10-01T10:00:00Z",
};
const options = () => ({
  canPublish: true,
  canRetire: true,
  canUpdate: true,
  onClone: vi.fn(),
  onPreview: vi.fn(),
  onPublish: vi.fn(),
  onRetire: vi.fn(),
});
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.editor.mockImplementation((_id: string, versionId?: string) => ({
    data: {
      definition: form,
      versions,
      version:
        versions.find((version) => version.id === versionId) ?? versions[0],
    },
    isPending: false,
  }));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function action(menu: Element, id: string) {
  return menu.querySelector<HTMLButtonElement>(`[data-action="${id}"]`)!;
}

describe("form version links and actions", () => {
  it("keeps only Edit on the form and links every version to its exact editor", async () => {
    const actions = options();
    await act(async () =>
      root.render(
        <FormsTable
          {...actions}
          canCreate
          emptyMessage="No forms"
          items={[form]}
          loading={false}
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
          page={1}
          pageSize={10}
          searchForm={null}
          total={1}
          totalPages={1}
        />,
      ),
    );
    const parent = container.querySelector(
      '[aria-label="Actions for Test form"]',
    )!;
    expect(parent.textContent).toBe("Edit");
    expect(
      container.querySelector(`a[href$="versionId=${versions[0].id}"]`),
    ).not.toBeNull();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Expand row"]')!
        .click(),
    );
    const table = container.querySelector('[aria-label="Test form versions"]')!;
    expect(table.querySelectorAll("th").length).toBe(6);
    expect(table.textContent).toContain("Actions");
    for (const version of versions) {
      expect(
        table.querySelector(
          `a[href="/admin/settings/forms/${definitionId}?versionId=${version.id}"]`,
        )?.textContent,
      ).toBe(`v${version.versionNumber}`);
    }
    const published = table.querySelector(
      '[aria-label="Actions for version 2"]',
    )!;
    expect(action(published, "publish").disabled).toBe(true);
    expect(action(published, "retire").disabled).toBe(false);
    expect(action(published, "clone").disabled).toBe(false);
    await act(async () => action(published, "preview").click());
    expect(actions.onPreview).toHaveBeenCalledWith(versions[1]);
  });

  it.each(["DRAFT", "PUBLISHED", "RETIRED"])(
    "enforces status and permissions for %s",
    async (status) => {
      const version = versions.find((item) => item.status === status)!;
      await act(async () =>
        root.render(
          <FormVersionActions version={version} options={options()} />,
        ),
      );
      expect(action(container, "publish").disabled).toBe(status !== "DRAFT");
      expect(action(container, "retire").disabled).toBe(status !== "PUBLISHED");
      expect(action(container, "clone").disabled).toBe(status === "DRAFT");
      await act(async () =>
        root.render(
          <FormVersionActions
            version={version}
            options={{
              ...options(),
              canPublish: false,
              canRetire: false,
              canUpdate: false,
            }}
          />,
        ),
      );
      expect(action(container, "publish").disabled).toBe(true);
      expect(action(container, "retire").disabled).toBe(true);
      expect(action(container, "clone").disabled).toBe(true);
      expect(action(container, "preview").disabled).toBe(false);
    },
  );

  it("labels only the pending version and disables actions while it runs", async () => {
    await act(async () =>
      root.render(
        <FormVersionActions
          version={versions[1]}
          options={{
            ...options(),
            pendingAction: { action: "retire", versionId: versions[1].id },
          }}
        />,
      ),
    );
    expect(action(container, "retire").textContent).toBe("Retiring…");
    expect(action(container, "preview").disabled).toBe(true);
  });

  it("uses the chosen version for preview, lifecycle commands, and cloning", async () => {
    const version = versions[1];
    function Harness() {
      const actions = useFormVersionActions();
      return (
        <FormVersionActions
          version={version}
          options={{ ...options(), ...actions }}
        />
      );
    }
    await act(async () => root.render(<Harness />));
    await act(async () => action(container, "preview").click());
    expect(mocks.editor).toHaveBeenLastCalledWith(definitionId, version.id);
    await act(async () => action(container, "retire").click());
    expect(mocks.retire.mutate).toHaveBeenCalledWith({
      definitionId,
      versionId: version.id,
      expectedRowVersion: version.rowVersion,
    });
    await act(async () => action(container, "clone").click());
    expect(mocks.clone.mutate.mock.calls[0][0]).toEqual({
      definitionId,
      sourceVersionId: version.id,
    });
    mocks.clone.mutate.mock.calls[0][1].onSuccess({
      definition: form,
      version: versions[0],
    });
    expect(mocks.push).toHaveBeenCalledWith(
      `/admin/settings/forms/${definitionId}?versionId=${versions[0].id}`,
    );
  });
});
