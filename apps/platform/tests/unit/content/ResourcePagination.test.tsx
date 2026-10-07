// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams("page=2&locale=en"),
}));

import { ResourcePagination } from "@/modules/content/ui/public/ResourcePagination";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { document.body.replaceChildren(); vi.clearAllMocks(); });

describe("Resource server pagination navigation", () => {
  it("requests the next server-rendered page while preserving other query parameters", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<ResourcePagination result={{
      items: [], page: 2, pageSize: 12, total: 31, totalPages: 3, hasNextPage: true,
    }} />));
    const next = [...container.querySelectorAll("button")]
      .find(button => button.textContent?.includes("Next"));
    await act(async () => next?.click());
    expect(push).toHaveBeenCalledWith("/resources?page=3&locale=en");
    expect(container.textContent).toContain("Showing 13–24 of 31");
    await act(async () => root.unmount());
  });

  it("disables navigation past either boundary", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<ResourcePagination result={{
      items: [], page: 1, pageSize: 12, total: 1, totalPages: 1, hasNextPage: false,
    }} />));
    expect([...container.querySelectorAll("button")].every(button => button.disabled)).toBe(true);
    await act(async () => root.unmount());
  });
});
