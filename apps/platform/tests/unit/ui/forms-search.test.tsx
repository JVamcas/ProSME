// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { clientFormsService } from "@/modules/forms/ClientFormsService";
import { FormsWorkspace } from "@/modules/forms/ui/staff/FormsWorkspace";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("forms catalogue search", () => {
  it("resets pagination when submitting or clearing search and keeps the term while paging", async () => {
    const list = vi
      .spyOn(clientFormsService, "list")
      .mockImplementation(async (input) => ({
        items: [],
        page: input.page,
        pageSize: input.pageSize,
        total: 30,
        totalPages: 3,
      }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const button = (label: string) =>
      Array.from(container.querySelectorAll("button")).find(
        (item) => item.textContent?.trim() === label,
      )!;
    const flush = async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    };
    try {
      await act(async () => {
        root.render(
          <QueryClientProvider client={client}>
            <FormsWorkspace canCreate canPublish canRetire canUpdate />
          </QueryClientProvider>,
        );
      });
      await flush();
      await act(async () => button("Next").click());
      await flush();
      expect(list).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 10,
        search: undefined,
      });

      const input = container.querySelector<HTMLInputElement>(
        'input[name="search"]',
      )!;
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      await act(async () => {
        setValue.call(input, "  Review  ");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        container
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
      });
      await flush();
      expect(list).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        search: "Review",
      });
      expect(container.textContent).toContain("No forms match your search.");

      await act(async () => button("Next").click());
      await flush();
      expect(list).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 10,
        search: "Review",
      });
      await act(async () => button("Clear").click());
      await flush();
      expect(list).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 10,
        search: undefined,
      });
      expect(input.value).toBe("");
    } finally {
      await act(async () => root.unmount());
      client.clear();
      list.mockRestore();
      container.remove();
    }
  });
});
