import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/chatbot/infrastructure/ChatbotKnowledgeRepository", () => ({
  knowledgeTransaction: (operation: (transaction: unknown) => unknown) =>
    operation({}),
}));
vi.mock("@/modules/chatbot/infrastructure/ChatbotCaseRepository", () => ({
  listChatbotCases: vi.fn().mockResolvedValue([]),
  auditChatbotCaseAccess: vi.fn().mockResolvedValue(undefined),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { GET } from "@/app/api/admin/chatbot/cases/route";
import { getChatbotCases } from "@/modules/chatbot/application/ServerChatbotCaseService";
import { listChatbotCases } from "@/modules/chatbot/infrastructure/ChatbotCaseRepository";
import { chatbotActor } from "../../support/ChatbotKnowledgeFixture";

beforeEach(() => vi.clearAllMocks());

describe("personal and monitoring case queues", () => {
  it("forces personal assignment even when the actor can read all cases", async () => {
    const actor = chatbotActor([permissionCodes.chatbotEscalationReadAll]);
    await getChatbotCases(actor, { scope: "assigned" });
    expect(listChatbotCases).toHaveBeenCalledWith(
      {}, actor.id, false, { scope: "assigned" },
    );
  });

  it("allows an assigned reader to read the personal queue", async () => {
    const actor = chatbotActor([permissionCodes.chatbotEscalationReadAssigned]);
    await getChatbotCases(actor, { scope: "assigned" });
    expect(listChatbotCases).toHaveBeenCalledWith(
      {}, actor.id, false, { scope: "assigned" },
    );
  });

  it("denies an explicit all-cases request to assigned-only readers", async () => {
    const actor = chatbotActor([permissionCodes.chatbotEscalationReadAssigned]);
    await expect(getChatbotCases(actor, { scope: "all" }))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(listChatbotCases).not.toHaveBeenCalled();
  });

  it("allows all-cases monitoring with the all-cases grant", async () => {
    const actor = chatbotActor([permissionCodes.chatbotEscalationReadAll]);
    await getChatbotCases(actor, { scope: "all" });
    expect(listChatbotCases).toHaveBeenCalledWith(
      {}, actor.id, true, { scope: "all" },
    );
  });

  it("rejects unsupported scopes before reading cases", async () => {
    await expect(getChatbotCases(chatbotActor(), { scope: "someone-else" }))
      .rejects.toThrow();
    expect(listChatbotCases).not.toHaveBeenCalled();
  });
});

describe("protected case queue transport", () => {
  it("rejects attempts to widen assigned-only access through the query string", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      chatbotActor([permissionCodes.chatbotEscalationReadAssigned]),
    );
    const response = await GET(new Request(
      "https://example.test/api/admin/chatbot/cases?scope=all",
    ));
    expect(response.status).toBe(403);
    expect(listChatbotCases).not.toHaveBeenCalled();
  });

  it("passes explicit personal scope from transport through to SQL filtering", async () => {
    const actor = chatbotActor([permissionCodes.chatbotEscalationReadAll]);
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
    const response = await GET(new Request(
      "https://example.test/api/admin/chatbot/cases?scope=assigned",
    ));
    expect(response.status).toBe(200);
    expect(listChatbotCases).toHaveBeenCalledWith(
      {}, actor.id, false, { scope: "assigned" },
    );
  });
});
