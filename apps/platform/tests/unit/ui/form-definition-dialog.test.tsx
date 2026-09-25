// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { FormsWorkspace } from "@/components/admin/forms/FormsWorkspace";
import { formQueryKeys } from "@/modules/forms/FormHooks";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const definitionId = "79e20de0-3558-4d63-90a4-8c9f5125df07";

function queryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const definition = {
    active: true,
    code: "FINANCE_REVIEW",
    description: "Finance review form",
    fieldCount: 0,
    id: definitionId,
    latestStatus: "DRAFT" as const,
    latestVersion: 2,
    latestVersionId: "89e20de0-3558-4d63-90a4-8c9f5125df07",
    latestVersionRowVersion: 1,
    name: "Finance Review",
    sectionCount: 0,
    updatedAt: "2026-09-14T08:00:00.000Z",
    usedByCount: 0,
  };
  client.setQueryData(formQueryKeys.list({ page: 1, pageSize: 10 }), {
    items: [definition],
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  });
  client.setQueryData(formQueryKeys.detail(definitionId), {
    allowedActions: ["UPDATE", "PUBLISH", "CLONE"],
    definition: {
      active: definition.active,
      code: definition.code,
      createdAt: definition.updatedAt,
      description: definition.description,
      id: definition.id,
      name: definition.name,
      updatedAt: definition.updatedAt,
    },
    fields: [],
    sections: [],
    version: {
      createdAt: definition.updatedAt,
      formDefinitionId: definitionId,
      id: "89e20de0-3558-4d63-90a4-8c9f5125df07",
      instructions: "Complete every finance check.",
      publishedAt: null,
      retiredAt: null,
      rowVersion: 1,
      status: "DRAFT",
      submitLabel: "Complete review",
      versionNumber: 2,
    },
    versions: [
      {
        createdAt: definition.updatedAt,
        formDefinitionId: definitionId,
        id: "89e20de0-3558-4d63-90a4-8c9f5125df07",
        instructions: "Complete every finance check.",
        publishedAt: null,
        retiredAt: null,
        rowVersion: 1,
        status: "DRAFT",
        submitLabel: "Complete review",
        versionNumber: 2,
      },
      {
        createdAt: "2026-09-10T08:00:00.000Z",
        formDefinitionId: definitionId,
        id: "99e20de0-3558-4d63-90a4-8c9f5125df07",
        instructions: "Complete every finance check.",
        publishedAt: "2026-09-11T08:00:00.000Z",
        retiredAt: "2026-09-13T08:00:00.000Z",
        rowVersion: 3,
        status: "RETIRED",
        submitLabel: "Complete review",
        versionNumber: 1,
      },
    ],
  });
  return client;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("form definition dialog", () => {
  it("expands a form row to show its versions table", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient()}>
          <FormsWorkspace canCreate canPublish canRetire canUpdate />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).not.toContain("Version 2");

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Expand row"]',
      )?.click();
    });

    expect(container.textContent).toContain("Version 2");
    expect(container.textContent).toContain("Version 1");
    expect(container.textContent).toContain("Retired");
    expect(container.querySelector('[aria-label="Finance Review versions"]'))
      .not.toBeNull();

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Collapse row"]',
      )?.click();
    });

    expect(container.textContent).not.toContain("Version 2");

    await act(async () => root.unmount());
  });

  it("shows only definition metadata when creating a form", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient()}>
          <FormsWorkspace canCreate canPublish canRetire canUpdate />
        </QueryClientProvider>,
      );
    });

    expect(container.querySelector(
      '[aria-label="Preview Finance Review"]',
    )).not.toBeNull();
    expect(container.querySelector(
      '[aria-label="Publish Finance Review"]',
    )).not.toBeNull();
    expect(container.querySelector<HTMLButtonElement>(
      '[aria-label="Retire Finance Review"]',
    )?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>(
      '[aria-label="Clone Finance Review"]',
    )?.disabled).toBe(true);

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Create form")
        ?.click();
    });

    expect(document.body.textContent).toContain("Form code");
    expect(document.body.textContent).toContain("Form name");
    expect(document.body.textContent).toContain("Description");
    expect(document.body.textContent).not.toContain("Submit button label");
    expect(document.body.textContent).not.toContain("Instructions");
    expect(
      document.body.querySelectorAll('label span[aria-hidden="true"]'),
    ).toHaveLength(2);
    await act(async () => root.unmount());
  });

  it("opens a populated update dialog from the edit action", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient()}>
          <FormsWorkspace canCreate canPublish canRetire canUpdate />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Edit Finance Review"]',
      )?.click();
    });

    expect(document.body.textContent).toContain("Edit form");
    expect(document.body.textContent).toContain("Form code");
    expect(document.body.textContent).toContain("Form name");
    expect(document.body.textContent).toContain("Description");
    expect(document.body.textContent).not.toContain("Submit button label");
    expect(document.body.textContent).not.toContain("Instructions");
    await act(async () => root.unmount());
  });
});
