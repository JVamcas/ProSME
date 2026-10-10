import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, vi } from "vitest";
import { workflowQueryKeys } from "@/modules/workflows/WorkflowHooks";
import { WorkflowTemplateAdminWorkspace } from "@/modules/workflows/ui/definitions/WorkflowTemplateAdminWorkspace";
import type {
  WorkflowTemplateListItem,
  WorkflowTemplateStatus,
} from "@/modules/workflows/domain/definitions/WorkflowTemplate";

const router = vi.hoisted(() => ({ push: vi.fn() }));
export { router };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
export const templateId = "41111111-1111-4111-8111-111111111111";
export const versionId = "42222222-2222-4222-8222-222222222222";
export const olderVersionId = "43333333-3333-4333-8333-333333333333";
const roots: Root[] = [];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  router.push.mockReset();
});

export function templateItem(
  status: WorkflowTemplateStatus = "DRAFT",
  number = 2,
): WorkflowTemplateListItem {
  return {
    code: "SME_STANDARD_GRANT",
    currentVersion: { id: versionId, number, rowVersion: 1, status },
    description: "Standard grant workflow",
    id: templateId,
    isLatest: true,
    name: "Standard grant",
    updatedAt: "2026-09-19T09:00:00.000Z",
  };
}

export async function renderWorkspace(
  status: WorkflowTemplateStatus = "DRAFT",
  number = 2,
  props = { canCreate: true, canPublish: true, canUpdate: true },
  versions?: WorkflowTemplateListItem[],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const parent = templateItem(status, number);
  const items = versions ?? [parent];
  const page = { page: 1, pageSize: 10, totalPages: 1 };
  client.setQueryData([...workflowQueryKeys.templates, 1, 10], {
    ...page,
    items: [parent],
    total: 1,
  });
  client.setQueryData(workflowQueryKeys.templateVersions(templateId, 1, 10), {
    ...page,
    items,
    total: items.length,
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <WorkflowTemplateAdminWorkspace {...props} />
      </QueryClientProvider>,
    ),
  );
  return { container, client, parent };
}

export async function expand(container: HTMLElement) {
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Expand row"]')
      ?.click(),
  );
}

export function menuItem(label: string) {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ).find((item) => item.textContent === label);
}

export async function openActions(
  container: HTMLElement,
  label = "Actions for Standard grant v2",
) {
  await act(async () =>
    container
      .querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
      ?.click(),
  );
}

export async function chooseAction(
  container: HTMLElement,
  action: string,
  label?: string,
) {
  await openActions(container, label);
  await act(async () => menuItem(action)?.click());
}
