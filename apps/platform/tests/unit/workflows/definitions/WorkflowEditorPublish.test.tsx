// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { WorkflowEditorWorkspace } from "@/modules/workflows/ui/definitions/WorkflowEditorWorkspace";
import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import { workflowQueryKeys } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("@/modules/workflows/ui/definitions/WorkflowStageFlow", () => ({
  WorkflowStageFlow: ({ canEdit }: { canEdit: boolean }) => (
    <div data-can-edit={String(canEdit)} />
  ),
}));

const definitionId = "41111111-1111-4111-8111-111111111111";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

function editor(
  status: WorkflowEditorView["version"]["status"],
): WorkflowEditorView {
  return {
    allowedActions: [],
    definition: {
      code: "STANDARD",
      description: "Standard workflow",
      id: definitionId,
      name: "Standard workflow",
    },
    graph: { stages: [], transitions: [] },
    validation: { errors: [], valid: true, warnings: [] },
    version: {
      createdAt: "2026-09-26T12:00:00.000Z",
      id: "42222222-2222-4222-8222-222222222222",
      number: 2,
      publishedAt: status === "PUBLISHED" ? "2026-09-26T13:00:00.000Z" : null,
      retiredAt: null,
      rowVersion: status === "PUBLISHED" ? 2 : 1,
      status,
    },
  };
}

async function mount(
  status: WorkflowEditorView["version"]["status"],
  canPublish: boolean,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(workflowQueryKeys.detail(definitionId), editor(status));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <WorkflowEditorWorkspace
          canPublish={canPublish}
          canRetire={false}
          canUpdate
          definitionId={definitionId}
        />
      </QueryClientProvider>,
    );
  });
  return { container, root };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("workflow editor publishing", () => {
  it("shows Publish only for permitted, publishable versions", async () => {
    for (const [status, canPublish, visible] of [
      ["DRAFT", true, true],
      ["APPROVED", true, true],
      ["PUBLISHED", true, false],
      ["DRAFT", false, false],
    ] as const) {
      const { container, root } = await mount(status, canPublish);
      expect(
        Boolean(
          container.querySelector('[aria-label="Publish Standard workflow"]'),
        ),
      ).toBe(visible);
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("keeps a historical version separate from the latest draft cache", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const historical = {
      ...editor("PUBLISHED"),
      version: { ...editor("PUBLISHED").version, number: 1 },
    };
    client.setQueryData(
      workflowQueryKeys.detail(definitionId),
      editor("DRAFT"),
    );
    client.setQueryData(
      workflowQueryKeys.detail(definitionId, historical.version.id),
      historical,
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <WorkflowEditorWorkspace
            canPublish
            canRetire={false}
            canUpdate
            definitionId={definitionId}
            versionId={historical.version.id}
          />
        </QueryClientProvider>,
      );
    });
    expect(container.textContent).toContain("v1");
    expect(container.textContent).not.toContain("v2");
    expect(container.querySelector('[data-can-edit="false"]')).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Publish Standard workflow"]'),
    ).toBeNull();
    await act(async () => root.unmount());
  });

  it("confirms publishing and updates the displayed status", async () => {
    vi.spyOn(clientWorkflowService, "getEditor")
      .mockResolvedValueOnce(editor("DRAFT"))
      .mockResolvedValue(editor("PUBLISHED"));
    const publish = vi
      .spyOn(clientWorkflowService, "lifecycleCommand")
      .mockResolvedValue(editor("PUBLISHED"));
    const { container, root } = await mount("DRAFT", true);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Publish Standard workflow"]',
        )
        ?.click();
    });
    expect(document.body.textContent).toContain(
      "Published workflow versions cannot be edited.",
    );
    expect(document.body.textContent).toContain("Publish workflow template");

    await act(async () => {
      Array.from(
        document.body.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] button',
        ),
      )
        .find((button) => button.textContent === "Publish")
        ?.click();
    });

    expect(publish).toHaveBeenCalledWith(
      definitionId,
      "publish",
      editor("DRAFT"),
    );
    expect(
      container.querySelector('[aria-label="Publish Standard workflow"]'),
    ).toBeNull();
    expect(container.textContent).toContain("Published");
    expect(container.querySelector('[data-can-edit="false"]')).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("shows the list's validation toast when publication is blocked", async () => {
    const invalid = editor("DRAFT");
    invalid.validation = {
      valid: false,
      errors: [
        {
          code: "INVALID_FORM_VERSION",
          message: "The bound form is unavailable.",
          path: "stages.0.tasks.0.formBinding.formVersionId",
        },
      ],
      warnings: [],
    };
    vi.spyOn(clientWorkflowService, "getEditor").mockResolvedValue(invalid);
    const publish = vi.spyOn(clientWorkflowService, "lifecycleCommand");
    const { container, root } = await mount("DRAFT", true);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Publish Standard workflow"]',
        )
        ?.click();
    });
    await act(async () => {
      Array.from(
        document.body.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] button',
        ),
      )
        .find((button) => button.textContent === "Publish")
        ?.click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Fix 1 workflow validation issue",
      expect.objectContaining({ duration: 12_000 }),
    );
    expect(publish).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Publish workflow template");
    await act(async () => root.unmount());
  });
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/admin/editor",
  useSearchParams: () => new URLSearchParams(),
}));
