import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  permissionCodes,
  getPermissionDefinition,
  getPermissionGroup,
} from "@/auth/authorization/permissions";
import { canAccessOperationsPortal } from "@/auth/authorization/portal-access";
import {
  filterPortalRoutes,
  operationsPortalRoutes,
} from "@/shared/ui/portal/portal-navigation";
import { requireChatbotEscalationAccess } from "@/modules/chatbot/application/ChatbotEscalationAccess";
import { readChatbotOperationalPolicy } from "@/modules/chatbot/infrastructure/ChatbotOperationalPolicy";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";

describe("CB0 permission and operational policy contracts", () => {
  it("exposes the knowledge workspace only with the knowledge read grant", () => {
    const actor = chatbotActor([permissionCodes.chatbotKnowledgeReadAll]);
    expect(canAccessOperationsPortal(actor)).toBe(true);
    const routes = filterPortalRoutes(
      operationsPortalRoutes,
      "operations",
      actor.capabilities,
    );
    expect(
      routes.some((route) => route.href === "/admin/chatbot/knowledge"),
    ).toBe(true);
    expect(
      filterPortalRoutes(operationsPortalRoutes, "operations", new Set()).some(
        (route) => route.href === "/admin/chatbot/knowledge",
      ),
    ).toBe(false);
  });
  it("keeps every chatbot code catalogued and grouped with explicit contextual descriptions", () => {
    for (const [key, code] of Object.entries(permissionCodes)) {
      if (!key.startsWith("chatbot")) continue;
      expect(getPermissionDefinition(code).description.length).toBeGreaterThan(
        20,
      );
      expect(getPermissionGroup(code)?.id).toMatch(/^chatbot-/);
    }
  });

  it.each(["read", "resolve"] as const)(
    "requires matching assignment for contextual %s grants",
    (action) => {
      const assigned =
        action === "read"
          ? permissionCodes.chatbotEscalationReadAssigned
          : permissionCodes.chatbotEscalationResolveAssigned;
      const user = chatbotActor([assigned]);
      expect(requireChatbotEscalationAccess(user, user.id, action)).toBe(user);
      expect(() =>
        requireChatbotEscalationAccess(user, chatbotId(2), action),
      ).toThrow(/capability/);
      expect(() => requireChatbotEscalationAccess(user, null, action)).toThrow(
        /capability/,
      );
      expect(() =>
        requireChatbotEscalationAccess(chatbotActor(), user.id, action),
      ).toThrow(/capability/);
    },
  );

  it("allows the all scope and denies anonymous transcript access", () => {
    const user = chatbotActor([permissionCodes.chatbotEscalationReadAll]);
    expect(requireChatbotEscalationAccess(user, null, "read")).toBe(user);
    expect(() => requireChatbotEscalationAccess(null, null, "read")).toThrow(
      /Authentication/,
    );
  });

  it("loads bounded configurable retention and recipients without cloud provisioning", () => {
    expect(readChatbotOperationalPolicy("")).toMatchObject({
      sessionMinutes: 30,
      escalationDays: 90,
      contactDays: 90,
      recipientUserIds: [],
    });
    expect(
      readChatbotOperationalPolicy(
        JSON.stringify({ recipientUserIds: [chatbotId(1)], contactDays: 7 }),
      ),
    ).toMatchObject({ recipientUserIds: [chatbotId(1)], contactDays: 7 });
    expect(() =>
      readChatbotOperationalPolicy('{"sessionMinutes":0}'),
    ).toThrow();
  });
});
