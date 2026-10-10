// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const ui = vi.hoisted(() => ({
  grants: new Set<string>(),
  userId: "00000000-0000-4000-8000-000000000001",
  supportCase: null as unknown,
  publish: vi.fn().mockResolvedValue({}),
  withdraw: vi.fn().mockResolvedValue({}),
  readCase: vi.fn(),
}));
vi.mock("@/shared/ui/portal/capability-context", () => ({
  useCapabilities: () => ui.grants,
  usePortalContext: () => ({ userId: ui.userId }),
}));
vi.mock("@/modules/chatbot/ui/operations/useChatbotKnowledge", () => ({
  usePublishChatbotKnowledge: () => ({
    mutateAsync: ui.publish,
    isPending: false,
  }),
  useWithdrawChatbotKnowledge: () => ({
    mutateAsync: ui.withdraw,
    isPending: false,
  }),
}));
vi.mock("@/modules/chatbot/ui/operations/useChatbotCases", () => ({
  useChatbotCase: () => {
    ui.readCase();
    return { data: ui.supportCase, isError: false };
  },
  useUpdateChatbotCase: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssignChatbotCase: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useChatbotCaseAssignees: () => ({
    data: [],
    isPending: false,
    isError: false,
  }),
}));
import { permissionCodes } from "@/auth/authorization/permissions";
import { ChatbotCaseDetail } from "@/modules/chatbot/ui/operations/ChatbotCaseDetail";
import { KnowledgeReleaseActions } from "@/modules/chatbot/ui/operations/KnowledgeReleaseActions";
import type {
  KnowledgeRelease,
  KnowledgeWorkspace,
} from "@/modules/chatbot/domain/ChatbotKnowledge";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
import { chatbotPortalRoutes } from "@/shared/ui/portal/ChatbotPortalRoutes";
import { filterPortalRoutes } from "@/shared/ui/portal/portal-navigation";
import { groupNavigationRoutes } from "@/shared/ui/navigation/NavigationSections";
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  ui.grants = new Set();
  ui.supportCase = {
    id: chatbotId(80),
    state: "NEW",
    assignedTo: chatbotId(2),
    assigneeName: "Case owner",
    reason: "MISSING_EVIDENCE",
    history: [
      {
        role: "visitor",
        text: "Screened support question",
        at: "2026-10-10T00:00:00Z",
      },
    ],
    contact: { name: "Consented visitor", email: "visitor@example.test" },
    resolutionNote: null,
    rowVersion: 2,
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
});
async function renderCase() {
  await act(async () => root.render(<ChatbotCaseDetail id={chatbotId(80)} />));
}
describe("protected case and release controls", () => {
  it("groups the permitted links under Chatbot using the shared navigation", () => {
    const routes = filterPortalRoutes(
      chatbotPortalRoutes,
      "operations",
      new Set([
        permissionCodes.chatbotEscalationReadAssigned,
        permissionCodes.chatbotKnowledgeReadAll,
      ]),
    );
    const groups = groupNavigationRoutes(routes);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Chatbot");
    expect(groups[0].routes.map((route) => route.label)).toEqual([
      "Knowledge base",
    ]);
    expect(
      filterPortalRoutes(chatbotPortalRoutes, "operations", new Set()),
    ).toEqual([]);
  });
  it("denies the view without reading protected history", async () => {
    await renderCase();
    expect(container.textContent).toContain("do not have permission");
    expect(ui.readCase).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Screened support question");
  });
  it("renders readable history/contact but hides assigned resolve controls for another owner", async () => {
    ui.grants = new Set([
      permissionCodes.chatbotEscalationReadAll,
      permissionCodes.chatbotEscalationResolveAssigned,
    ]);
    await renderCase();
    expect(container.textContent).toContain("Screened support question");
    expect(container.textContent).toContain("Case owner");
    expect(container.textContent).toContain("Consented visitor");
    expect(container.querySelector("form")).toBeNull();
    ui.grants.add(permissionCodes.chatbotEscalationResolveAll);
    await renderCase();
    expect(container.querySelector("textarea")).not.toBeNull();
  });
  it("publishes the reviewed hash and observed epoch with shared controls and hides revoked publication", async () => {
    ui.grants = new Set([permissionCodes.chatbotKnowledgePublishAll]);
    const release = {
      id: chatbotId(80),
      contentHash: "a".repeat(64),
      status: "APPROVED",
    } as KnowledgeRelease;
    const workspace: KnowledgeWorkspace = {
      releases: [release],
      activeReleaseId: null,
      epoch: "17",
    };
    await act(async () =>
      root.render(
        <KnowledgeReleaseActions release={release} workspace={workspace} />,
      ),
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>("button")!.click(),
    );
    expect(ui.publish).toHaveBeenCalledWith({
      id: release.id,
      contentHash: release.contentHash,
      expectedEpoch: "17",
    });
    workspace.releases = [{ ...release, withdrawn: true }];
    await act(async () =>
      root.render(
        <KnowledgeReleaseActions release={release} workspace={workspace} />,
      ),
    );
    expect(container.querySelector("button")).toBeNull();
    expect(container.textContent).toContain("cannot be published again");
  });
});
