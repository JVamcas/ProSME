// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  router: { refresh: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
}));

import { PublicContentRefresh } from "@/modules/content/ui/public/PublicContentRefresh";

let root: Root;
let visibility: DocumentVisibilityState;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.pathname = "/";
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(
    () => visibility,
  );
  root = createRoot(document.createElement("div"));
  await act(async () => root.render(<PublicContentRefresh />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("public content refresh", () => {
  it("refreshes on navigation and while the page stays open", async () => {
    expect(mocks.router.refresh).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(mocks.router.refresh).toHaveBeenCalledTimes(2);

    mocks.pathname = "/funding";
    await act(async () => root.render(<PublicContentRefresh />));
    expect(mocks.router.refresh).toHaveBeenCalledTimes(3);
  });

  it("pauses in the background and refreshes when the visitor returns", async () => {
    visibility = "hidden";
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(mocks.router.refresh).toHaveBeenCalledTimes(1);

    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("focus"));
    });
    expect(mocks.router.refresh).toHaveBeenCalledTimes(2);
  });

  it("refreshes after reconnecting or restoring a browser history page", async () => {
    await act(async () => vi.advanceTimersByTime(5_000));
    window.dispatchEvent(new Event("online"));
    expect(mocks.router.refresh).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTime(5_000));
    window.dispatchEvent(new Event("pageshow"));
    expect(mocks.router.refresh).toHaveBeenCalledTimes(3);
  });

  it("removes timers and listeners when leaving the public layout", async () => {
    await act(async () => root.unmount());
    await act(async () => vi.advanceTimersByTime(60_000));
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("pageshow"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(mocks.router.refresh).toHaveBeenCalledTimes(1);
  });
});
