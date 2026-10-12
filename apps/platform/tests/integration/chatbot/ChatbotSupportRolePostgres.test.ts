import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { permissionCodes } from "@/auth/authorization/permissions";
import { chatbotNoticeVersion } from "@/modules/chatbot/domain/ChatbotAnswer";
import {
  startChatbotConversation,
  submitChatbotQuestion,
} from "@/modules/chatbot/application/ServerChatbotConversationService";
import {
  assignChatbotCase,
  getChatbotCase,
  saveChatbotCaseState,
} from "@/modules/chatbot/application/ServerChatbotCaseService";
import { chatbotDeliveryRecipientAuthorized } from "@/modules/notifications/infrastructure/ChatbotNotificationRecipientRepository";
import { installChatbotRuntimeFixture } from "../../support/ChatbotRuntimeFixture";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;
let migration: string;

beforeEach(async () => {
  if (!url) return;
  fixture = await installChatbotRuntimeFixture(url);
  migration = await readFile(
    new URL("../../../drizzle/0196_chatbot_support_role.sql", import.meta.url),
    "utf8",
  );
  // Match the production authorization constraints omitted by the lean fixture.
  await fixture.pool.query(`
    ALTER TABLE app_roles ADD COLUMN description text;
    ALTER TABLE app_roles ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE app_roles ADD UNIQUE(code);
    ALTER TABLE app_role_capabilities ADD PRIMARY KEY(role_id, capability_id);
    DELETE FROM app_notification_event_rule_recipients;
    DELETE FROM app_user_roles;
  `);
});

afterEach(async () => {
  if (fixture) await fixture.close();
});

async function supportRole() {
  const result = await fixture.pool.query(
    "SELECT id, name FROM app_roles WHERE code = 'chatbot_support'",
  );
  return result.rows[0] as { id: string; name: string };
}

async function createCase(turn: number) {
  const session = await startChatbotConversation(
    { consent: true, noticeVersion: chatbotNoticeVersion },
    "synthetic-network",
  );
  return submitChatbotQuestion(session.id, `Bearer ${session.credential}`, {
    turnId: chatbotId(turn),
    question: "Unknown funding question",
  });
}

(url ? describe : describe.skip)("Chatbot Support role bootstrap", () => {
  it("creates an empty role with only case permissions and role-based email routing", async () => {
    await fixture.pool.query("DELETE FROM app_notification_event_rules");
    await fixture.pool.query(migration);
    const role = await supportRole();
    expect(role.name).toBe("Chatbot Support");
    const grants = await fixture.pool.query(
      `SELECT permission.code FROM app_role_capabilities grant_record
       JOIN app_capabilities permission ON permission.id = grant_record.capability_id
       WHERE grant_record.role_id = $1 ORDER BY permission.code`,
      [role.id],
    );
    expect(grants.rows.map(({ code }) => code)).toEqual([
      permissionCodes.chatbotEscalationAssignAll,
      permissionCodes.chatbotEscalationReadAll,
      permissionCodes.chatbotEscalationResolveAssigned,
    ]);
    expect(
      (await fixture.pool.query("SELECT * FROM app_user_roles")).rows,
    ).toEqual([]);
    const routing = await fixture.pool.query(
      `SELECT recipient.recipient_type, recipient.recipient_role_id, recipient.is_required,
         channel.code FROM app_notification_event_rule_recipients recipient
       JOIN app_notification_event_rule_channels binding ON binding.rule_recipient_id = recipient.id
       JOIN app_notification_channels channel ON channel.id = binding.channel_id`,
    );
    expect(routing.rows).toEqual([
      {
        recipient_type: "SPECIFIC_ROLE",
        recipient_role_id: role.id,
        is_required: false,
        code: "EMAIL",
      },
    ]);
    const response = await createCase(810);
    expect(response.caseId).toBeTruthy();
    expect(response.notificationQueued).toBe(false);
  });

  it("preserves staff membership, edited grants and removed routing on replay", async () => {
    await fixture.pool.query(migration);
    const role = await supportRole();
    await fixture.pool.query(
      "INSERT INTO app_user_roles(user_id, role_id) VALUES ($1, $2)",
      [fixture.actor.id, role.id],
    );
    await fixture.pool.query(
      "UPDATE app_roles SET name = 'Client support team' WHERE id = $1",
      [role.id],
    );
    await fixture.pool.query(
      "DELETE FROM app_role_capabilities WHERE role_id = $1",
      [role.id],
    );
    await fixture.pool.query(
      "DELETE FROM app_notification_event_rule_recipients",
    );
    await fixture.pool.query(migration);
    expect((await supportRole()).name).toBe("Client support team");
    expect(
      (await fixture.pool.query("SELECT * FROM app_user_roles")).rows,
    ).toHaveLength(1);
    expect(
      (
        await fixture.pool.query(
          "SELECT * FROM app_role_capabilities WHERE role_id = $1",
          [role.id],
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await fixture.pool.query(
          "SELECT * FROM app_notification_event_rule_recipients",
        )
      ).rows,
    ).toEqual([]);
  });

  it("preserves a preconfigured notification audience", async () => {
    await fixture.pool.query(
      `INSERT INTO app_notification_event_rule_recipients
       (id, rule_id, recipient_type, recipient_user_id)
       VALUES ($1, $2, 'SPECIFIC_USER', $3)`,
      [chatbotId(902), chatbotId(901), fixture.actor.id],
    );
    await fixture.pool.query(migration);
    expect(
      (
        await fixture.pool.query(
          "SELECT recipient_type FROM app_notification_event_rule_recipients",
        )
      ).rows,
    ).toEqual([{ recipient_type: "SPECIFIC_USER" }]);
    expect(await supportRole()).toBeTruthy();
  });

  it("notifies current members, permits assigned resolution and rejects removed members", async () => {
    await fixture.pool.query(migration);
    const role = await supportRole();
    await fixture.pool.query(
      "INSERT INTO app_user_roles(user_id, role_id) VALUES ($1, $2)",
      [fixture.actor.id, role.id],
    );
    const actor = {
      ...fixture.actor,
      capabilities: new Set([
        permissionCodes.chatbotEscalationReadAll,
        permissionCodes.chatbotEscalationAssignAll,
        permissionCodes.chatbotEscalationResolveAssigned,
      ]),
    };
    const response = await createCase(811);
    expect(response.notificationQueued).toBe(true);
    const caseId = response.caseId!;
    const supportCase = await getChatbotCase(actor, caseId);
    await expect(
      saveChatbotCaseState(actor, caseId, {
        state: "RESOLVED",
        resolutionNote: "Followed up",
        expectedRowVersion: supportCase.rowVersion,
      }),
    ).rejects.toThrow();
    await assignChatbotCase(actor, caseId, {
      assignedTo: actor.id,
      expectedRowVersion: supportCase.rowVersion,
    });
    const assigned = await getChatbotCase(actor, caseId);
    await saveChatbotCaseState(actor, caseId, {
      state: "RESOLVED",
      resolutionNote: "Followed up",
      expectedRowVersion: assigned.rowVersion,
    });
    expect((await getChatbotCase(actor, caseId)).state).toBe("RESOLVED");
    expect(
      await chatbotDeliveryRecipientAuthorized(
        caseId,
        actor.id,
        "staff@example.test",
        [],
        chatbotId(901),
      ),
    ).toBe(true);
    await fixture.pool.query("DELETE FROM app_user_roles WHERE user_id = $1", [
      actor.id,
    ]);
    expect(
      await chatbotDeliveryRecipientAuthorized(
        caseId,
        actor.id,
        "staff@example.test",
        [],
        chatbotId(901),
      ),
    ).toBe(false);
    await expect(
      getChatbotCase({ ...actor, capabilities: new Set() }, caseId),
    ).rejects.toThrow();
    expect((await createCase(812)).notificationQueued).toBe(false);
  });
});
