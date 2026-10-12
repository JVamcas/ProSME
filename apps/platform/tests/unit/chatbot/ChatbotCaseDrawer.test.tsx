// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ChatbotCase } from "@/modules/chatbot/domain/ChatbotCase";

const ui = vi.hoisted(() => ({
  grants: new Set<string>(),
  list: vi.fn(),
  detail: vi.fn(),
  replace: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
  assign: vi.fn().mockResolvedValue({}),
  supportCase: null as ChatbotCase | null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: ui.replace }),
}));
vi.mock("@/shared/ui/portal/capability-context", () => ({
  useCapabilities: () => ui.grants,
  usePortalContext: () => ({ userId: "staff-owner" }),
}));
vi.mock("@/modules/chatbot/ui/operations/useChatbotCases", () => ({
  useChatbotCases: (scope: string) => {
    ui.list(scope);
    return {
      data: { pages: [{ items: [ui.supportCase] }] },
      isError: false,
      hasNextPage: false,
    };
  },
  useChatbotCase: (id: string) => {
    ui.detail(id);
    return { data: ui.supportCase, isError: false };
  },
  useUpdateChatbotCase: () => ({ mutateAsync: ui.update, isPending: false }),
  useAssignChatbotCase: () => ({ mutateAsync: ui.assign, isPending: false }),
  useChatbotCaseAssignees: () => ({
    data: [],
    isPending: false,
    isError: false,
  }),
}));
import { ChatbotCaseWorkspace } from "@/modules/chatbot/ui/operations/ChatbotCaseWorkspace";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  ui.grants = new Set([permissionCodes.chatbotEscalationReadAll]);
  ui.supportCase = {
    id: "00000000-0000-4000-8000-000000000001",
    reference: "SUP-000005",
    state: "NEW",
    reason: "MISSING_EVIDENCE",
    assignedTo: "other-owner",
    assigneeName: "Case owner",
    question: "Which documents?",
    history: [
      { role: "visitor", text: "Which documents?", at: "2026-10-11T00:00:00Z" },
      {
        role: "assistant",
        text: "Check the call requirements.",
        at: "2026-10-11T00:00:01Z",
      },
    ],
    createdAt: "2026-10-11T00:00:00Z",
    updatedAt: "2026-10-11T00:00:01Z",
    rowVersion: 3,
    releaseId: null,
    sourceIds: [],
    resolutionNote: null,
    contact: null,
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
});
async function render(initialCaseId?: string) {
  await act(async () =>
    root.render(<ChatbotCaseWorkspace initialCaseId={initialCaseId} />),
  );
}
async function openCase() {
  const link =
    container.querySelector<HTMLAnchorElement>('a[href*="/cases/"]')!;
  link.focus();
  await act(async () => link.click());
  return link;
}
describe("Operations case ArrowLink and right drawer", () => {
  it("opens protected bubbles over the queue and restores focus on Escape", async () => {
    await render();
    expect(ui.detail).not.toHaveBeenCalled();
    const link = await openCase();
    expect(link.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("table")).not.toBeNull();
    const drawer = document.querySelector('[role="dialog"]')!;
    expect(drawer.textContent).toContain("Case SUP-000005");
    expect(
      drawer.querySelector('[data-chat-sender="visitor"]')?.textContent,
    ).toContain("Which documents?");
    expect(
      drawer.querySelector('[data-chat-sender="assistant"]')?.textContent,
    ).toContain("Check the call requirements.");
    expect(drawer.querySelector("textarea")).toBeNull();
    expect(drawer.querySelector("form")).toBeNull();
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(link);
    expect(ui.replace).not.toHaveBeenCalled();
  });

  it("preserves modified-click links without reading case history", async () => {
    await render();
    const link =
      container.querySelector<HTMLAnchorElement>('a[href*="/cases/"]')!;
    await act(async () =>
      link.dispatchEvent(
        new MouseEvent("click", {
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(ui.detail).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens direct case URLs in the permitted queue and closes to that queue", async () => {
    ui.grants = new Set([permissionCodes.chatbotEscalationReadAssigned]);
    await render(ui.supportCase!.id);
    expect(ui.list).toHaveBeenCalledWith("assigned");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () =>
      document.querySelector<HTMLButtonElement>("[data-panel-close]")!.click(),
    );
    expect(ui.replace).toHaveBeenCalledWith("/admin/my-queue/escalated-cases");
  });

  it("denies the view before queue or history queries without a read grant", async () => {
    ui.grants.clear();
    await render(ui.supportCase!.id);
    expect(ui.list).not.toHaveBeenCalled();
    expect(ui.detail).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("enforces assignment context and exposes the existing authorized forms", async () => {
    ui.grants.add(permissionCodes.chatbotEscalationResolveAssigned);
    await render();
    await openCase();
    expect(document.querySelector("form")).toBeNull();
    ui.supportCase!.assignedTo = "staff-owner";
    ui.grants.add(permissionCodes.chatbotEscalationAssignAll);
    await render();
    const drawer = document.querySelector('[role="dialog"]')!;
    expect(drawer.querySelectorAll("form")).toHaveLength(2);
    expect(drawer.querySelector("textarea")).not.toBeNull();
    await act(async () =>
      drawer
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(ui.update).toHaveBeenCalledWith({
      id: ui.supportCase!.id,
      values: { state: "NEW", resolutionNote: "", expectedRowVersion: 3 },
    });
  });
});
