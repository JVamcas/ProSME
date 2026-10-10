import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationEmailBranding",
  () => ({
    notificationBrandingLogoUrl: "cid:test-logo",
    loadNotificationBrandingLogoAttachment: vi.fn(async () => ({
      filename: "test.png",
      content: Buffer.from("test"),
    })),
  }),
);
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({
    APP_PUBLIC_URL: "https://platform.example.test",
  }),
  getDeploymentEnvironment: () => "test",
}));
import { installChatbotRuntimeFixture } from "../../support/ChatbotRuntimeFixture";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  startChatbotConversation,
  submitChatbotQuestion,
  setChatbotConversationContact,
} from "@/modules/chatbot/application/ServerChatbotConversationService";
import { chatbotNoticeVersion } from "@/modules/chatbot/domain/ChatbotAnswer";
import {
  getChatbotCase,
  getChatbotCases,
  assignChatbotCase,
  saveChatbotCaseState,
} from "@/modules/chatbot/application/ServerChatbotCaseService";
import {
  cleanupChatbotRetention,
  updateChatbotRetentionPolicy,
} from "@/modules/chatbot/application/ServerChatbotPolicyService";
import { processNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";
import { NotificationEmailSendError } from "@/modules/notifications/application/NotificationEmailSender";
import { notificationErrorCodes } from "@/modules/notifications/domain/NotificationErrors";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { GET as caseGET } from "@/app/api/admin/chatbot/cases/[caseId]/route";
const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;
beforeEach(async () => {
  if (url) fixture = await installChatbotRuntimeFixture(url);
});
afterEach(async () => {
  if (fixture) await fixture.close();
});
async function newCase() {
  const session = await startChatbotConversation(
    { consent: true, noticeVersion: chatbotNoticeVersion },
    "synthetic-network",
  );
  const response = await submitChatbotQuestion(
    session.id,
    `Bearer ${session.credential}`,
    { turnId: chatbotId(800), question: "Unknown funding question" },
  );
  return { session, response, id: response.caseId! };
}
const assignedActor = () =>
  chatbotActor([
    permissionCodes.chatbotEscalationReadAssigned,
    permissionCodes.chatbotEscalationResolveAssigned,
  ]);
(url ? describe : describe.skip)(
  "staff follow-up policy, retention and delivery",
  () => {
    it("denies no permission and assignment mismatch before history and checks staff routes", async () => {
      const support = await newCase();
      await expect(
        getChatbotCase(chatbotActor([]), support.id),
      ).rejects.toThrow("Missing required");
      await expect(getChatbotCase(assignedActor(), support.id)).rejects.toThrow(
        "Missing required",
      );
      expect((await getChatbotCases(assignedActor(), {})).items).toEqual([]);
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(assignedActor());
      const result = await caseGET(
        new Request("http://localhost/api/admin/chatbot/cases"),
        { params: Promise.resolve({ caseId: support.id }) },
      );
      expect(result.status).toBe(403);
      expect(await result.text()).not.toContain("Unknown funding question");
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
      expect(
        (
          await caseGET(
            new Request("http://localhost/api/admin/chatbot/cases"),
            { params: Promise.resolve({ caseId: support.id }) },
          )
        ).status,
      ).toBe(401);
    });
    it("allows assigned read/resolve, uses row versions, and requires an authorized assignee", async () => {
      const support = await newCase();
      const before = await getChatbotCase(fixture.actor, support.id);
      await fixture.pool.query(
        "INSERT INTO app_users(id,display_name,email) VALUES ($1,'No grants','ungranted@example.test')",
        [chatbotId(2)],
      );
      await expect(
        assignChatbotCase(fixture.actor, support.id, {
          assignedTo: chatbotId(2),
          expectedRowVersion: before.rowVersion,
        }),
      ).rejects.toThrow("authorized");
      await assignChatbotCase(fixture.actor, support.id, {
        assignedTo: fixture.actor.id,
        expectedRowVersion: before.rowVersion,
      });
      const scoped = await getChatbotCase(assignedActor(), support.id);
      expect(scoped.history.length).toBe(2);
      const resolved = await saveChatbotCaseState(assignedActor(), support.id, {
        state: "RESOLVED",
        resolutionNote: "Refer to the published programme guide.",
        expectedRowVersion: scoped.rowVersion,
      });
      expect(resolved.state).toBe("RESOLVED");
      await expect(
        saveChatbotCaseState(assignedActor(), support.id, {
          state: "IN_PROGRESS",
          resolutionNote: "",
          expectedRowVersion: scoped.rowVersion,
        }),
      ).rejects.toThrow("changed");
      const second = await submitChatbotQuestion(
        support.session.id,
        `Bearer ${support.session.credential}`,
        { turnId: chatbotId(801), question: "Another unsupported question" },
      );
      expect(second.caseId).not.toBe(support.id);
    });
    it("filters unauthorized configured recipients when capturing the occurrence", async () => {
      await fixture.pool.query("DELETE FROM app_role_capabilities");
      const support = await newCase();
      expect(support.response.notificationQueued).toBe(false);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_notification_deliveries delivery JOIN app_notification_outbox occurrence ON occurrence.id=delivery.outbox_id WHERE occurrence.event_key='chatbot.case.created'",
          )
        ).rows[0].n,
      ).toBe(0);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_cases",
          )
        ).rows[0].n,
      ).toBe(1);
    });
    it("reuses delivery retries without duplicating cases and emails only the reference/link", async () => {
      const support = await newCase();
      const send = vi
        .fn()
        .mockRejectedValueOnce(
          new NotificationEmailSendError(
            notificationErrorCodes.providerUnavailable,
            true,
          ),
        )
        .mockResolvedValue({ providerMessageId: "synthetic-message" });
      const now = new Date();
      const first = await processNotificationBatch({
        batchSize: 10,
        emailSender: { send },
        executionTimeoutMs: 30000,
        lockTimeoutMs: 60000,
        now: () => now,
        owner: "fixture-worker",
        random: () => 0,
      });
      expect(first.retrying).toBe(1);
      const second = await processNotificationBatch({
        batchSize: 10,
        emailSender: { send },
        executionTimeoutMs: 30000,
        lockTimeoutMs: 60000,
        now: () => new Date(now.getTime() + 120000),
        owner: "fixture-worker",
        random: () => 0,
      });
      expect(second.sent).toBe(1);
      expect(send).toHaveBeenCalledTimes(2);
      const email = JSON.stringify(send.mock.calls[1][0]);
      expect(email).toContain(support.id);
      expect(email).toContain(`/admin/chatbot/cases/${support.id}`);
      expect(email).not.toContain("Unknown funding question");
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_cases",
          )
        ).rows[0].n,
      ).toBe(1);
    });
    it("rechecks recipient permission before a delivery retry", async () => {
      await newCase();
      await fixture.pool.query("DELETE FROM app_role_capabilities");
      const send = vi.fn();
      const result = await processNotificationBatch({
        batchSize: 10,
        emailSender: { send },
        executionTimeoutMs: 30000,
        lockTimeoutMs: 60000,
        owner: "fixture-worker",
      });
      expect(result.failed).toBe(1);
      expect(send).not.toHaveBeenCalled();
      expect(
        (
          await fixture.pool.query(
            "SELECT delivery.last_error_code FROM app_notification_deliveries delivery JOIN app_notification_outbox occurrence ON occurrence.id=delivery.outbox_id WHERE occurrence.event_key='chatbot.case.created'",
          )
        ).rows[0].last_error_code,
      ).toBe(notificationErrorCodes.invalidRecipient);
    });
    it("expires sessions/contact/cases and applies shorter retention without revealing expired data", async () => {
      const support = await newCase();
      await setChatbotConversationContact(
        support.session.id,
        `Bearer ${support.session.credential}`,
        { name: "Visitor", email: "visitor@example.test", consent: true },
      );
      await expect(
        updateChatbotRetentionPolicy(chatbotActor([]), {
          sessionMinutes: 5,
          escalationDays: 1,
          contactDays: 1,
        }),
      ).rejects.toThrow();
      await updateChatbotRetentionPolicy(fixture.actor, {
        sessionMinutes: 5,
        escalationDays: 1,
        contactDays: 1,
      });
      await fixture.pool.query(
        "UPDATE app_chatbot_cases SET contact_expires_at=now()-interval '1 second' WHERE id=$1",
        [support.id],
      );
      expect(
        (await getChatbotCase(fixture.actor, support.id)).contact,
      ).toBeNull();
      expect((await cleanupChatbotRetention()).contacts).toBe(1);
      await fixture.pool.query(
        "UPDATE app_chatbot_cases SET expires_at=now()-interval '1 second' WHERE id=$1",
        [support.id],
      );
      await fixture.pool.query(
        "UPDATE app_chatbot_conversations SET expires_at=now()-interval '1 second' WHERE id=$1",
        [support.session.id],
      );
      await expect(getChatbotCase(fixture.actor, support.id)).rejects.toThrow(
        "not found",
      );
      const cleaned = await cleanupChatbotRetention();
      expect(cleaned.cases).toBe(1);
      expect(cleaned.conversations).toBe(1);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_turns",
          )
        ).rows[0].n,
      ).toBe(0);
    });
  },
);
