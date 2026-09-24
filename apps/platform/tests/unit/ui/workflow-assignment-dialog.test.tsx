// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { WorkflowDefinitionsWorkspace } from "@/components/admin/workflows/WorkflowDefinitionsWorkspace";
import { workflowQueryKeys } from "@/modules/workflows/WorkflowHooks";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

function queryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(workflowQueryKeys.all, [
    {
      active: true,
      code: "REFERENCE",
      description: "Reference workflow",
      id: "definition",
      latestStatus: "PUBLISHED",
      latestVersion: 1,
      name: "Reference",
      updatedAt: "2026-09-14T08:00:00.000Z",
    },
  ]);
  client.setQueryData(workflowQueryKeys.assignments, []);
  client.setQueryData(workflowQueryKeys.opportunities, {
    items: [
      {
        closesAt: "2026-12-31T00:00:00.000Z",
        id: "00000000-0000-4000-8000-000000000042",
        opensAt: "2026-09-01T00:00:00.000Z",
        slug: "growth-fund",
        status: "open",
        summary: "Growth funding",
        title: "Growth Fund",
      },
    ],
    nextCursor: null,
    total: 1,
  });
  client.setQueryData(workflowQueryKeys.published, [
    {
      definitionId: "definition",
      name: "Reference",
      versionId: "89e20de0-3558-4d63-90a4-8c9f5125df07",
      versionNumber: 1,
    },
  ]);
  return client;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow funding assignment dialog", () => {
  it("opens from the published workflow row action", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient()}>
          <WorkflowDefinitionsWorkspace
            canCreate
            canPublish
            canRetire
            canUpdate
          />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Assign funding to Reference"]',
      )?.click();
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Assign funding opportunity");
    expect(document.body.textContent).toContain("Published version 1");
    expect(document.body.textContent).toContain("Growth Fund");
    await act(async () => root.unmount());
  });
});
