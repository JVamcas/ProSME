// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";
import { FundingCallVersionsPanel } from "@/modules/funding-calls/ui/FundingCallVersionsPanel";
import { stored } from "../../support/FundingCallThumbnailTestFixture";

const state = vi.hoisted(() => ({
  loading: false,
  selected: null as string | null,
  historical: undefined as FundingCallView | undefined,
}));

vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useFundingCallVersions: () => ({
    data: {
      total: 2,
      items: [
        {
          id: "current-version",
          versionNumber: 2,
          title: "Current call title",
          publishedAt: "2026-10-09T12:00:00.000Z",
          current: true,
        },
        {
          id: "historical-version",
          versionNumber: 1,
          title: "Historical call title",
          publishedAt: "2026-10-01T12:00:00.000Z",
          current: false,
        },
      ],
    },
    isPending: false,
    isFetching: false,
  }),
  useFundingCallVersion: (_id: string, versionId: string | null) => {
    state.selected = versionId;
    return {
      data: versionId && !state.loading ? state.historical : undefined,
      isPending: state.loading,
    };
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;

beforeEach(() => {
  state.loading = false;
  state.selected = null;
  state.historical = {
    ...stored,
    title: "Historical call title",
    viewedPublishedVersionId: "historical-version",
    opensAt: stored.opensAt.toISOString(),
    closesAt: stored.closesAt.toISOString(),
    createdAt: stored.createdAt.toISOString(),
    updatedAt: stored.updatedAt.toISOString(),
  };
});

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
});

async function viewHistoricalVersion() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<FundingCallVersionsPanel id={stored.id} />);
  });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  const trigger = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Actions for version 1"]',
  )!;
  expect(trigger).not.toBeNull();
  await act(async () => trigger.click());
  const item = document.querySelector<HTMLElement>('[role="menuitem"]')!;
  expect(item.textContent).toBe("View version");
  await act(async () => {
    item.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    item.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, button: 0 }),
    );
    item.click();
  });
  return document.querySelector<HTMLElement>('aside[role="dialog"]')!;
}

describe("funding call version actions", () => {
  it("opens the selected published version in the right drawer and closes on Escape", async () => {
    const drawer = await viewHistoricalVersion();
    expect(state.selected).toBe("historical-version");
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain("Historical call title");
    expect(drawer.textContent).not.toContain("Current call title");
    expect(drawer.classList.contains("right-0")).toBe(true);
    expect(document.querySelector('[role="menu"]')).toBeNull();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(state.selected).toBeNull();
  });

  it("shows loading in the drawer while the historical version is fetched", async () => {
    state.loading = true;
    const drawer = await viewHistoricalVersion();
    expect(drawer.textContent).toContain("Loading version…");
    expect(drawer.textContent).not.toContain("Historical call title");
  });
});
