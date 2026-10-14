// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormsWorkspace } from "@/modules/forms/ui/staff/FormsWorkspace";
import { formQueryKeys } from "@/modules/forms/FormHooks";
import { clientFormsService } from "@/modules/forms/ClientFormsService";
import type { FormEditorView } from "@/modules/forms/FormTypes";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

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
    purpose: "APPLICATION_REVIEW" as const,
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
      purpose: definition.purpose,
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

function formAction(label: string) {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ).find((item) => item.textContent === label);
}

async function openFormActions(container: HTMLElement) {
  await act(async () => {
    container
      .querySelector<HTMLButtonElement>(
        '[aria-label="Actions for Finance Review"]',
      )
      ?.click();
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("form definition dialog", () => {
  it("generates a stable code automatically when creating a form", async () => {
    const client = queryClient();
    const view = client.getQueryData<FormEditorView>(
      formQueryKeys.detail(definitionId),
    )!;
    const create = vi
      .spyOn(clientFormsService, "create")
      .mockResolvedValue(view);
    const list = vi
      .spyOn(clientFormsService, "list")
      .mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <FormsWorkspace canCreate canPublish canRetire canUpdate />
          </QueryClientProvider>,
        ),
      );
      await act(async () => {
        Array.from(container.querySelectorAll("button"))
          .find((button) => button.textContent === "Create form")!
          .click();
      });
      const dialog = document.body.querySelector('[role="dialog"]')!;
      expect(dialog.querySelector('input[name="code"]')).toBeNull();
      const input =
        dialog.querySelector<HTMLInputElement>('input[name="name"]')!;
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      await act(async () => {
        setValue.call(input, "New review");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        dialog
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
      });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.stringMatching(/^K_[A-F0-9]{32}$/),
          name: "New review",
        }),
      );
    } finally {
      await act(async () => root.unmount());
      client.clear();
      create.mockRestore();
      list.mockRestore();
      container.remove();
    }
  });

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
      container
        .querySelector<HTMLButtonElement>('[aria-label="Expand row"]')
        ?.click();
    });

    expect(container.textContent).toContain("v2");
    expect(container.textContent).toContain("v1");
    expect(container.textContent).toContain("Retired");
    expect(
      container.querySelector('[aria-label="Finance Review versions"]'),
    ).not.toBeNull();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Collapse row"]')
        ?.click();
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

    await openFormActions(container);
    expect(formAction("Preview")).toBeDefined();
    expect(formAction("Publish")).toBeDefined();
    expect(formAction("Retire")?.getAttribute("aria-disabled")).toBe("true");
    expect(formAction("Clone")?.getAttribute("aria-disabled")).toBe("true");

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Create form")
        ?.click();
    });

    expect(document.body.textContent).not.toContain("Form code");
    expect(document.body.textContent).toContain("Form name");
    expect(document.body.textContent).toContain("Purpose");
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

    await openFormActions(container);
    await act(async () => formAction("Edit")?.click());

    expect(document.body.textContent).toContain("Edit form");
    expect(document.body.textContent).not.toContain("Form code");
    expect(document.body.textContent).toContain("Form name");
    expect(document.body.textContent).toContain("Purpose");
    expect(document.body.textContent).toContain("Description");
    expect(document.body.textContent).not.toContain("Submit button label");
    expect(document.body.textContent).not.toContain("Instructions");
    await act(async () => root.unmount());
  });
});
