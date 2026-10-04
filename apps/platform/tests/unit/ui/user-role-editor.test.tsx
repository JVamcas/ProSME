// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserRoleEditor } from "@/modules/users/ui/UserRoleEditor";

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock("@/modules/users/UserAccessHooks", () => ({
  useUpdateRole: () => ({ isPending: false, mutateAsync: mocks.mutateAsync }),
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const capabilities = [
  { code: "branding.read", description: "Read branding settings" },
  { code: "branding.manage", description: "Upload platform images" },
  { code: "workflow.task.assigned.hold", description: "Suspend assigned work" },
];
const role = {
  assignedUserCount: 1,
  capabilityCodes: ["branding.manage"],
  code: "officer",
  description: "Programme operations",
  id: "role-id",
  name: "Programme Officer",
};
let root: Root | null = null;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
  vi.clearAllMocks();
});

async function renderEditor() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<UserRoleEditor capabilities={capabilities} role={role} />),
  );
}

async function search(value: string) {
  const input = document.querySelector<HTMLInputElement>(
    'input[type="search"]',
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function visibleCodes() {
  return [
    ...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ]
    .filter(
      (checkbox) => !checkbox.closest("label")?.classList.contains("hidden"),
    )
    .map((checkbox) => checkbox.value);
}

describe("role permission search", () => {
  it("matches codes and descriptions without case sensitivity, and clears the filter", async () => {
    await renderEditor();
    await search(" HOLD ");
    expect(visibleCodes()).toEqual(["workflow.task.assigned.hold"]);
    await search("IMAGES");
    expect(visibleCodes()).toEqual(["branding.manage"]);
    await search("unmatched phrase");
    expect(visibleCodes()).toEqual([]);
    expect(document.body.textContent).toContain(
      "No permissions match your search.",
    );
    await search("");
    expect(visibleCodes()).toEqual(
      capabilities.map((permission) => permission.code),
    );
  });

  it("preserves existing and newly selected permissions across filters and saves only role fields", async () => {
    mocks.mutateAsync.mockResolvedValueOnce(undefined);
    await renderEditor();
    await search("hold");
    await act(async () => {
      document
        .querySelector<HTMLInputElement>(
          'input[value="workflow.task.assigned.hold"]',
        )
        ?.click();
    });
    await search("read");
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[type="submit"]')
        ?.click();
    });
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      roleId: role.id,
      input: {
        capabilityCodes: ["branding.manage", "workflow.task.assigned.hold"],
        description: role.description,
        name: role.name,
      },
    });
  });
});
