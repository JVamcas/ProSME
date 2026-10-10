// @vitest-environment happy-dom
import "../../support/NavigationTestMocks";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";
import { FundingCallHeaderActions } from "@/modules/funding-calls/ui/FundingCallHeaderActions";
import { stored } from "../../support/FundingCallThumbnailTestFixture";

const state = vi.hoisted(() => ({
  call: undefined as FundingCallView | undefined,
  prepare: { isPending: false, mutate: vi.fn() },
  publish: { isPending: false, mutate: vi.fn() },
  governance: { isPending: false, mutate: vi.fn() },
  lifecycle: { isPending: false, error: null, mutateAsync: vi.fn() },
}));
vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useFundingCall: () => ({ data: state.call }),
  usePrepareFundingCallReplacement: () => state.prepare,
  usePublishFundingCall: () => state.publish,
  useChangeFundingCallGovernanceStatus: () => state.governance,
  useChangeFundingCallLifecycleStatus: () => state.lifecycle,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
const permissions = {
  canApprove: false,
  canArchive: false,
  canPublish: false,
  canReturn: false,
  canResume: true,
  canSubmit: false,
  canSuspend: true,
  canUpdate: true,
  canWithdraw: true,
  canWithdrawForAmendment: false,
  canWithdrawOwnRequest: false,
};
const call: FundingCallView = {
  ...stored,
  status: "LIVE",
  currentPublishedVersionId: "00000000-0000-4000-8000-000000000008",
  opensAt: stored.opensAt.toISOString(),
  closesAt: stored.closesAt.toISOString(),
  createdAt: stored.createdAt.toISOString(),
  updatedAt: stored.updatedAt.toISOString(),
};
beforeEach(() => {
  vi.clearAllMocks();
  state.call = call;
  state.prepare.isPending = false;
});
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
});
async function render(overrides: Partial<typeof permissions> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <FundingCallHeaderActions
        {...permissions}
        {...overrides}
        call={state.call!}
      />,
    ),
  );
  return container;
}
async function openMenu(container: HTMLElement) {
  await act(async () =>
    container.querySelector<HTMLButtonElement>("button")!.click(),
  );
  return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
}
async function select(item: HTMLElement) {
  await act(async () => {
    item.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    item.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, button: 0 }),
    );
    item.click();
  });
}
describe("funding call header action dropdown", () => {
  it("uses a single Actions button and Edit still prepares a versioned draft", async () => {
    const container = await render();
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(container.querySelector("button")?.textContent).toBe("Actions");
    const items = await openMenu(container);
    expect(items.map((item) => item.textContent)).toEqual([
      "Edit",
      "Suspend",
      "Permanently withdraw",
    ]);
    await select(items[0]);
    expect(state.prepare.mutate).toHaveBeenCalledWith(
      {
        expectedRowVersion: call.rowVersion,
        sourceVersionId: call.currentPublishedVersionId,
      },
      expect.any(Object),
    );
  });

  it("keeps operational confirmation dialogs after menu selection", async () => {
    const items = await openMenu(await render());
    await select(items.find((item) => item.textContent === "Suspend")!);
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "Suspend reason",
    );
    expect(state.lifecycle.mutateAsync).not.toHaveBeenCalled();
  });

  it("uses draft governance and effective suspension in the same dropdown", async () => {
    state.call = {
      ...call,
      status: "DRAFT",
      effectiveStatus: "SUSPENDED",
      draftVersionId: "00000000-0000-4000-8000-000000000009",
    };
    const items = await openMenu(await render({ canSubmit: true }));
    expect(items.map((item) => item.textContent)).toEqual([
      "Submit for approval",
      "Resume",
      "Permanently withdraw",
    ]);
  });

  it("keeps Publish available for an approved working version", async () => {
    state.call = {
      ...call,
      status: "APPROVED",
      effectiveStatus: "LIVE",
      draftVersionId: "00000000-0000-4000-8000-000000000009",
    };
    const items = await openMenu(await render({ canPublish: true }));
    await select(items.find((item) => item.textContent === "Publish")!);
    expect(state.publish.mutate).toHaveBeenCalledWith(
      call.rowVersion,
      expect.any(Object),
    );
  });

  it("hides the dropdown when no permitted commands are available", async () => {
    const container = await render({
      canUpdate: false,
      canSuspend: false,
      canWithdraw: false,
    });
    expect(container.querySelector("button")).toBeNull();
  });
});
