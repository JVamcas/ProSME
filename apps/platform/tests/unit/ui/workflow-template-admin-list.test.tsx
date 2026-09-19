// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { workflowQueryKeys } from "@/modules/workflows/WorkflowHooks";
import { WorkflowTemplateAdminWorkspace } from "@/modules/workflows/ui/definitions/WorkflowTemplateAdminWorkspace";

function queryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(workflowQueryKeys.templates, [
    {
      code: "SME_STANDARD_GRANT",
      currentVersion: {
        id: "42222222-2222-4222-8222-222222222222",
        number: 2,
        status: "PENDING_APPROVAL",
      },
      description: "Standard grant workflow",
      id: "41111111-1111-4111-8111-111111111111",
      name: "Standard grant",
      updatedAt: "2026-09-19T09:00:00.000Z",
    },
  ]);
  return client;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow template admin list", () => {
  it("shows the current version, status, and details navigation", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient()}>
          <WorkflowTemplateAdminWorkspace canCreate />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain("Standard grant");
    expect(container.textContent).toContain("Version 2");
    expect(container.textContent).toContain("Pending Approval");
    expect(
      container.querySelector<HTMLAnchorElement>(
        'a[href="/admin/workflows/41111111-1111-4111-8111-111111111111"]',
      ),
    ).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("opens the create-template form only for authorized users", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient()}>
          <WorkflowTemplateAdminWorkspace canCreate />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")?.click();
    });

    expect(document.body.textContent).toContain("Create workflow template");
    const requiredInputs = document.body.querySelectorAll<HTMLInputElement>(
      'input[required]',
    );
    expect(requiredInputs).toHaveLength(2);
    expect(requiredInputs[0]?.labels?.[0]?.textContent).toBe("Template code*");
    expect(requiredInputs[1]?.labels?.[0]?.textContent).toBe("Template name*");
    await act(async () => root.unmount());

    const readOnlyContainer = document.createElement("div");
    document.body.append(readOnlyContainer);
    const readOnlyRoot = createRoot(readOnlyContainer);
    await act(async () => {
      readOnlyRoot.render(
        <QueryClientProvider client={queryClient()}>
          <WorkflowTemplateAdminWorkspace canCreate={false} />
        </QueryClientProvider>,
      );
    });
    expect(readOnlyContainer.textContent).not.toContain("Create template");
    await act(async () => readOnlyRoot.unmount());
  });
});
