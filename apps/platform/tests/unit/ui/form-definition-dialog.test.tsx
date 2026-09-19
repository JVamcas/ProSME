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
    latestVersion: 1,
    name: "Finance Review",
    sectionCount: 0,
    updatedAt: "2026-09-14T08:00:00.000Z",
    usedByCount: 0,
  };
  client.setQueryData(formQueryKeys.all, [definition]);
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
      versionNumber: 1,
    },
    versions: [],
  });
  return client;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("form definition dialog", () => {
  it("shows only definition metadata when creating a form", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient()}>
          <FormsWorkspace canCreate canUpdate />
        </QueryClientProvider>,
      );
    });

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
          <FormsWorkspace canCreate canUpdate />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Edit form"]',
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
