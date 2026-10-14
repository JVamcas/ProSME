// @vitest-environment happy-dom

import "../../support/NavigationTestMocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { clientFormsService } from "@/modules/forms/ClientFormsService";
import { formQueryKeys } from "@/modules/forms/FormHooks";
import type { FormEditorView, FormStatus } from "@/modules/forms/FormTypes";
import { FormEditorWorkspace } from "@/modules/forms/ui/FormEditorWorkspace";
import { definition } from "../../support/FormFieldRuleFixture";
import { toast } from "@/shared/ui/Toast";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const definitionId = "70000000-0000-4000-8000-000000000001";
const versionId = "70000000-0000-4000-8000-000000000002";

function editor(status: FormStatus = "DRAFT"): FormEditorView {
  const runtime = definition();
  const version: FormEditorView["version"] = {
    id: versionId,
    formDefinitionId: definitionId,
    versionNumber: 3,
    status,
    instructions: "Keep these instructions.",
    displayMode: "STEPS",
    submissionMode: "WITH_TASK_ACTION",
    submitLabel: "Complete review",
    rowVersion: 7,
    createdAt: "2026-10-14T10:00:00Z",
    publishedAt: null,
    retiredAt: null,
  };
  return {
    definition: {
      id: definitionId,
      code: "TECHNICAL_REVIEW",
      name: "Technical review",
      description: "Review metadata",
      purpose: "APPLICATION_REVIEW",
      active: true,
      updatedAt: version.createdAt,
    },
    version,
    fields: runtime.fields,
    sections: runtime.sections,
    versions: [version],
    allowedActions: [],
  };
}

async function mount(view: FormEditorView, canUpdate = true, openMenu = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(formQueryKeys.version(definitionId, versionId), view);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <FormEditorWorkspace
          canPublish
          canRetire
          canUpdate={canUpdate}
          id={definitionId}
          versionId={versionId}
        />
      </QueryClientProvider>,
    );
  });
  if (openMenu)
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Form actions"]')!
        .click();
    });
  return {
    client,
    container,
    close: async () => {
      await act(async () => root.unmount());
      client.clear();
      container.remove();
    },
  };
}

function action(label: string) {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ).find((item) => item.textContent === label)!;
}

describe("form editor header actions", () => {
  it("shows a failed duplication without adding an unsaved field", async () => {
    const update = vi
      .spyOn(clientFormsService, "update")
      .mockRejectedValue(new Error("Draft changed. Refresh and retry."));
    const notification = vi
      .spyOn(toast, "error")
      .mockReturnValue("test-notification");
    const workspace = await mount(editor(), true, false);
    try {
      await act(async () => {
        workspace.container
          .querySelector<HTMLButtonElement>('[aria-label="Duplicate Enabled"]')!
          .click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(notification).toHaveBeenCalledWith(
        "Draft changed. Refresh and retry.",
      );
      expect(
        workspace.container.querySelectorAll(
          '[aria-label="Duplicate Enabled"]',
        ),
      ).toHaveLength(1);
    } finally {
      await workspace.close();
      update.mockRestore();
      notification.mockRestore();
    }
  });

  it("persists a duplicate next to its source in the exact displayed draft", async () => {
    const view = editor();
    let saved = view;
    const update = vi
      .spyOn(clientFormsService, "update")
      .mockImplementation(async (_, input) => {
        saved = { ...view, fields: input.fields };
        return saved;
      });
    const get = vi
      .spyOn(clientFormsService, "get")
      .mockImplementation(async () => saved);
    const workspace = await mount(view, true, false);
    try {
      await act(async () => {
        workspace.container
          .querySelector<HTMLButtonElement>('[aria-label="Duplicate Enabled"]')!
          .click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(update).toHaveBeenCalledOnce();
      expect(get).not.toHaveBeenCalled();
      const request = update.mock.calls[0][1];
      expect(request).toMatchObject({
        versionId,
        expectedRowVersion: 7,
        sections: view.sections,
      });
      expect(request.fields).toHaveLength(3);
      expect(request.fields.map((field) => field.order)).toEqual([1, 2, 3]);
      expect(request.fields[0].key).toBe("ENABLED");
      expect(request.fields[1]).toMatchObject({
        key: expect.stringMatching(/^K_[A-F0-9]{32}$/),
        label: "Enabled",
        type: "YES_NO",
      });
      expect(request.fields[2].key).toBe("AMOUNT");
      expect(
        workspace.container.querySelectorAll(
          '[aria-label="Duplicate Enabled"]',
        ),
      ).toHaveLength(2);
    } finally {
      await workspace.close();
      update.mockRestore();
      get.mockRestore();
    }
  });

  it("opens the existing metadata dialog and saves the exact displayed draft without losing its contents", async () => {
    const view = editor();
    const saved = {
      ...view,
      definition: { ...view.definition, name: "Updated review" },
    };
    const update = vi
      .spyOn(clientFormsService, "update")
      .mockResolvedValue(saved);
    const get = vi.spyOn(clientFormsService, "get").mockResolvedValue(saved);
    const workspace = await mount(view);
    try {
      expect(action("Preview")).toBeDefined();
      expect(action("Publish").getAttribute("aria-disabled")).not.toBe("true");
      expect(action("Retire").getAttribute("aria-disabled")).toBe("true");
      expect(action("Create new draft").getAttribute("aria-disabled")).toBe(
        "true",
      );
      await act(async () => action("Edit").click());
      const dialog = document.body.querySelector('[role="dialog"]')!;
      expect(dialog.textContent).toContain("Edit form");
      expect(dialog.querySelector('input[name="code"]')).toBeNull();
      expect(
        dialog.querySelector<HTMLInputElement>('input[name="name"]')!.value,
      ).toBe(view.definition.name);
      expect(
        dialog.querySelector<HTMLTextAreaElement>(
          'textarea[name="description"]',
        )!.value,
      ).toBe(view.definition.description);
      expect(dialog.textContent).not.toContain("Instructions");
      await act(async () => {
        dialog
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(update).toHaveBeenCalledWith(
        definitionId,
        expect.objectContaining({
          versionId,
          code: view.definition.code,
          expectedRowVersion: 7,
          fields: view.fields,
          sections: view.sections,
          instructions: view.version.instructions,
          displayMode: "STEPS",
          submitLabel: "Complete review",
        }),
      );
      expect(get).not.toHaveBeenCalled();
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      expect(workspace.container.textContent).toContain("Updated review - V3");
      expect(
        workspace.client.getQueryData(
          formQueryKeys.version(definitionId, versionId),
        ),
      ).toEqual(saved);
    } finally {
      await workspace.close();
      update.mockRestore();
      get.mockRestore();
    }
  });

  it.each([
    ["PUBLISHED", true],
    ["RETIRED", true],
    ["DRAFT", false],
  ] as const)(
    "disables metadata edits for %s with update permission %s",
    async (status, canUpdate) => {
      const workspace = await mount(editor(status), canUpdate);
      try {
        expect(action("Edit").getAttribute("aria-disabled")).toBe("true");
        expect(
          workspace.container.querySelector<HTMLButtonElement>(
            '[aria-label="Duplicate Enabled"]',
          )!.disabled,
        ).toBe(true);
        expect(action("Create new draft").getAttribute("aria-disabled")).toBe(
          status !== "DRAFT" && canUpdate ? null : "true",
        );
      } finally {
        await workspace.close();
      }
    },
  );
});
