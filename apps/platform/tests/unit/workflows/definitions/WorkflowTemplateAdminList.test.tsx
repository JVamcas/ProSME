// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { workflowQueryKeys } from "@/modules/workflows/WorkflowHooks";
import { WorkflowTemplateAdminWorkspace } from "@/modules/workflows/ui/definitions/WorkflowTemplateAdminWorkspace";

function queryClient(
  status: "APPROVED" | "DRAFT" | "PENDING_APPROVAL" = "PENDING_APPROVAL",
  versionNumber = 2,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData([...workflowQueryKeys.templates, 1, 10], {
    items: [
      {
        code: "SME_STANDARD_GRANT",
        currentVersion: {
          id: "42222222-2222-4222-8222-222222222222",
          number: versionNumber,
          rowVersion: 1,
          status,
        },
        description: "Standard grant workflow",
        id: "41111111-1111-4111-8111-111111111111",
        isLatest: true,
        name: "Standard grant",
        updatedAt: "2026-09-19T09:00:00.000Z",
      },
    ],
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  });
  return client;
}

async function openActions(container: HTMLElement) {
  await act(async () => {
    container.querySelector<HTMLButtonElement>(
      '[aria-label^="Actions for Standard grant"]',
    )?.click();
  });
}

function menuItem(label: string) {
  return Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    .find((item) => item.textContent === label);
}

async function chooseAction(container: HTMLElement, label: string) {
  await openActions(container);
  await act(async () => menuItem(label)?.click());
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
          <WorkflowTemplateAdminWorkspace canCreate canPublish canUpdate />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain("Standard grant");
    expect(container.textContent).toContain("v2");
    expect(container.textContent).toContain("Pending Approval");
    expect(container.textContent).toContain("Actions");
    expect(container.querySelector('[aria-label="Actions for Standard grant v2"]'))
      .not.toBeNull();
    await openActions(container);
    expect(menuItem("Edit")).toBeDefined();
    expect(menuItem("Clone")).toBeDefined();
    expect(menuItem("Delete")).toBeDefined();
    expect(
      container.querySelector<HTMLAnchorElement>(
        'a[href="/admin/workflows/41111111-1111-4111-8111-111111111111?versionId=42222222-2222-4222-8222-222222222222"]',
      ),
    ).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("links each version of the same template to its own editor", async () => {
    const client = queryClient("DRAFT");
    const key = [...workflowQueryKeys.templates, 1, 10];
    const data = client.getQueryData<{ items: Record<string, unknown>[] }>(key)!;
    const latest = data.items[0];
    client.setQueryData(key, {
      ...data,
      items: [latest, {
        ...latest,
        isLatest: false,
        currentVersion: {
          id: "43333333-3333-4333-8333-333333333333",
          number: 1,
          rowVersion: 1,
          status: "PUBLISHED",
        },
      }],
      total: 2,
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <WorkflowTemplateAdminWorkspace canCreate canPublish canUpdate />
        </QueryClientProvider>,
      );
    });
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/workflows/41111111-1111-4111-8111-111111111111?versionId=42222222-2222-4222-8222-222222222222",
      "/admin/workflows/41111111-1111-4111-8111-111111111111?versionId=43333333-3333-4333-8333-333333333333",
    ]);
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Actions for Standard grant v1"]',
      )?.click();
    });
    expect(menuItem("Edit")?.getAttribute("aria-disabled")).toBe("true");
    expect(menuItem("Delete")?.getAttribute("aria-disabled")).toBe("true");
    expect(menuItem("Publish")).toBeUndefined();
    await act(async () => root.unmount());
  });

  it("opens the create-template form only for authorized users", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient()}>
          <WorkflowTemplateAdminWorkspace canCreate canPublish canUpdate />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")?.click();
    });

    expect(document.body.textContent).toContain("Create workflow template");
    const requiredInputs =
      document.body.querySelectorAll<HTMLInputElement>("input[required]");
    expect(requiredInputs).toHaveLength(2);
    expect(requiredInputs[0]?.labels?.[0]?.textContent).toContain(
      "Template code*",
    );
    expect(requiredInputs[1]?.labels?.[0]?.textContent).toContain(
      "Template name*",
    );
    await act(async () => root.unmount());

    const readOnlyContainer = document.createElement("div");
    document.body.append(readOnlyContainer);
    const readOnlyRoot = createRoot(readOnlyContainer);
    await act(async () => {
      readOnlyRoot.render(
        <QueryClientProvider client={queryClient()}>
          <WorkflowTemplateAdminWorkspace
            canCreate={false}
            canPublish={false}
            canUpdate={false}
          />
        </QueryClientProvider>,
      );
    });
    expect(readOnlyContainer.textContent).not.toContain("Create template");
    await act(async () => readOnlyRoot.unmount());
  });

  it("opens the create-template dialog with draft values for editing", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient("DRAFT")}>
          <WorkflowTemplateAdminWorkspace canCreate canPublish canUpdate />
        </QueryClientProvider>,
      );
    });
    await chooseAction(container, "Edit");

    expect(document.body.textContent).toContain("Edit workflow template");
    expect(
      document.body.querySelector<HTMLInputElement>('input[name="code"]')
        ?.value,
    ).toBe("SME_STANDARD_GRANT");
    expect(document.body.textContent).toContain("Save template");
    await act(async () => root.unmount());
  });

  it("opens an in-app confirmation dialog before deleting", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient("DRAFT", 1)}>
          <WorkflowTemplateAdminWorkspace canCreate canPublish canUpdate />
        </QueryClientProvider>,
      );
    });
    await chooseAction(container, "Delete");

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.textContent).toContain(
      "Delete Standard grant? This cannot be undone.",
    );
    expect(dialog?.textContent).toContain("Cancel");
    expect(dialog?.textContent).toContain("Delete");
    await act(async () => root.unmount());
  });

  it("shows the publish action for draft and approved versions", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient("APPROVED")}>
          <WorkflowTemplateAdminWorkspace canCreate canPublish canUpdate />
        </QueryClientProvider>,
      );
    });

    await openActions(container);
    expect(menuItem("Publish")).toBeDefined();
    await act(async () => menuItem("Publish")?.click());
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.textContent).toContain("Publish Standard grant version 2?");
    await act(async () => root.unmount());

    const draftContainer = document.createElement("div");
    document.body.append(draftContainer);
    const draftRoot = createRoot(draftContainer);
    await act(async () => {
      draftRoot.render(
        <QueryClientProvider client={queryClient("DRAFT")}>
          <WorkflowTemplateAdminWorkspace canCreate canPublish canUpdate />
        </QueryClientProvider>,
      );
    });
    await openActions(draftContainer);
    expect(menuItem("Publish")).toBeDefined();
    await act(async () => draftRoot.unmount());
  });
});
