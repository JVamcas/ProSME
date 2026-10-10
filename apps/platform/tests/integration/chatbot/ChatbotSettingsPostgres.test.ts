import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/integrations/storage/GoogleCloudStorageOptions", () => ({
  getGoogleCloudStorageOptions: () => ({}),
}));
import { installChatbotRuntimeFixture } from "../../support/ChatbotRuntimeFixture";
import { installChatbotConversationFixture } from "../../support/ChatbotConversationRuntimeFixture";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  getChatbotSettings,
  updateChatbotSettings,
} from "@/modules/chatbot/application/ServerChatbotSettingsService";
import {
  getChatbotPublicNotice,
  startChatbotConversation,
  submitChatbotQuestion,
  setChatbotConversationContact,
} from "@/modules/chatbot/application/ServerChatbotConversationService";
import { readChatbotRuntimeSettings } from "@/modules/chatbot/infrastructure/ChatbotSettingsRepository";
import { chatbotNoticeVersion } from "@/modules/chatbot/domain/ChatbotAnswer";
import type { ChatbotPassageSelector } from "@/modules/chatbot/domain/ChatbotAnswer";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;
let fixtureIsOpen = false;
afterEach(async () => {
  vi.unstubAllEnvs();
  if (fixtureIsOpen) {
    fixtureIsOpen = false;
    await fixture.close();
  }
});

function providerReady() {
  vi.stubEnv("GOOGLE_CLOUD_PROJECT", "chatbot-project");
}
const session = () =>
  startChatbotConversation(
    { consent: true, noticeVersion: chatbotNoticeVersion },
    "synthetic-settings-network",
  );
async function save(publicEnabled: boolean, modelEnabled: boolean) {
  return updateChatbotSettings(fixture.actor, {
    publicEnabled,
    modelEnabled,
    expectedRowVersion: (await readChatbotRuntimeSettings()).rowVersion,
  });
}

(url ? describe : describe.skip)(
  "application-controlled chatbot settings",
  () => {
    beforeEach(async () => {
      vi.stubEnv("GOOGLE_CLOUD_PROJECT", undefined);
      vi.stubEnv("CHATBOT_MODEL", undefined);
      vi.stubEnv("CHATBOT_MODEL_LOCATION", undefined);
      if (url)
        fixture = await installChatbotRuntimeFixture(url, {
          enableChatbot: false,
        });
      fixtureIsOpen = Boolean(url);
    });

    it("defaults off after repeatable migration, ignores old environment switches and separates permissions", async () => {
      vi.stubEnv("CHATBOT_PUBLIC_ENABLED", "true");
      vi.stubEnv("CHATBOT_MODEL_ENABLED", "true");
      expect(await getChatbotSettings(fixture.actor)).toMatchObject({
        publicEnabled: false,
        modelEnabled: false,
        rowVersion: 1,
        providerReady: false,
      });
      expect((await getChatbotPublicNotice()).enabled).toBe(false);
      await expect(session()).rejects.toThrow("turned off");
      await expect(getChatbotSettings(chatbotActor([]))).rejects.toThrow(
        "Missing required",
      );
      await expect(
        updateChatbotSettings(
          chatbotActor([permissionCodes.chatbotSettingsReadAll]),
          { publicEnabled: true, modelEnabled: false, expectedRowVersion: 1 },
        ),
      ).rejects.toThrow("Missing required");
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_settings_audit",
          )
        ).rows[0].n,
      ).toBe(0);
    });

    it("persists switches/audit, requires provider readiness only when enabling AI, and can shut down with invalid provider settings", async () => {
      await expect(save(true, true)).rejects.toThrow(
        "AI provider is configured",
      );
      await save(true, false);
      const visitor = await session();
      const selector = { select: vi.fn<ChatbotPassageSelector["select"]>() };
      const response = await submitChatbotQuestion(
        visitor.id,
        `Bearer ${visitor.credential}`,
        { turnId: chatbotId(800), question: "Public question" },
        {
          runtime: { load: vi.fn(), validate: vi.fn() },
          selector,
        },
      );
      expect(selector.select).not.toHaveBeenCalled();
      expect(response.answer.reason).toBe("SERVICE_FAILURE");
      expect(response.caseId).toBeTruthy();
      providerReady();
      await save(true, true);
      expect((await getChatbotSettings(fixture.actor)).modelEnabled).toBe(true);
      vi.stubEnv("GOOGLE_CLOUD_PROJECT", undefined);
      await save(false, true);
      await save(false, false);
      const audit = (
        await fixture.pool.query(
          "SELECT before_settings,after_settings,actor_id FROM app_chatbot_settings_audit ORDER BY created_at,id",
        )
      ).rows;
      expect(audit).toHaveLength(4);
      expect(audit.every((entry) => entry.actor_id === fixture.actor.id)).toBe(
        true,
      );
      expect(audit[0].before_settings.publicEnabled).toBe(false);
      expect(audit[0].after_settings.publicEnabled).toBe(true);
    });

    it("uses shared database state and rejects competing updates of the same version", async () => {
      const values = {
        publicEnabled: true,
        modelEnabled: false,
        expectedRowVersion: 1,
      };
      const results = await Promise.allSettled([
        updateChatbotSettings(fixture.actor, values),
        updateChatbotSettings(fixture.actor, values),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);
      expect((await readChatbotRuntimeSettings()).rowVersion).toBe(2);
      expect((await getChatbotPublicNotice()).enabled).toBe(true);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_settings_audit",
          )
        ).rows[0].n,
      ).toBe(1);
    });

    it("rolls back switch changes when audit creation fails", async () => {
      await fixture.pool.query(
        "CREATE FUNCTION fail_settings_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated audit failure'; END; $$; CREATE TRIGGER fail_settings BEFORE INSERT ON app_chatbot_settings_audit FOR EACH ROW EXECUTE FUNCTION fail_settings_audit()",
      );
      await expect(save(true, false)).rejects.toMatchObject({
        cause: expect.objectContaining({ message: "simulated audit failure" }),
      });
      expect(await readChatbotRuntimeSettings()).toEqual({
        publicEnabled: false,
        modelEnabled: false,
        rowVersion: 1,
      });
    });
  },
);

(url ? describe : describe.skip)("chatbot shutdown during answering", () => {
  let dependencies: Awaited<
    ReturnType<typeof installChatbotConversationFixture>
  >["dependencies"];
  beforeEach(async () => {
    providerReady();
    vi.stubEnv("CHATBOT_MODEL", undefined);
    vi.stubEnv("CHATBOT_MODEL_LOCATION", undefined);
    vi.stubEnv(
      "GCS_CHATBOT_KNOWLEDGE_BUCKET",
      "chatbot-settings-fixture-bucket",
    );
    if (url)
      ({ fixture, dependencies } =
        await installChatbotConversationFixture(url));
    fixtureIsOpen = Boolean(url);
  });

  it("blocks existing turns/contact and in-flight completion when the bot is disabled, then permits retry after re-enabling", async () => {
    const visitor = await session();
    const auth = `Bearer ${visitor.credential}`;
    const input = { turnId: chatbotId(800), question: "Public question 1" };
    dependencies.selector.select.mockImplementationOnce(async (request) => {
      await save(false, true);
      return { status: "ANSWER", passageIds: [request.candidates[0].id] };
    });
    await expect(
      submitChatbotQuestion(visitor.id, auth, input, dependencies),
    ).rejects.toThrow("turned off");
    await expect(
      submitChatbotQuestion(visitor.id, auth, input, dependencies),
    ).rejects.toThrow("turned off");
    await expect(
      setChatbotConversationContact(visitor.id, auth, {
        consent: true,
        name: "Visitor",
        email: "visitor@example.test",
      }),
    ).rejects.toThrow("turned off");
    expect(
      (
        await fixture.pool.query(
          "SELECT completed_turns FROM app_chatbot_conversations WHERE id=$1",
          [visitor.id],
        )
      ).rows[0].completed_turns,
    ).toBe(0);
    expect(
      (
        await fixture.pool.query(
          "SELECT count(*)::int AS n FROM app_chatbot_cases",
        )
      ).rows[0].n,
    ).toBe(0);
    await save(true, true);
    expect(
      (await submitChatbotQuestion(visitor.id, auth, input, dependencies))
        .answer.status,
    ).toBe("ANSWERED");
  });

  it("discards model results after AI is disabled and stops subsequent model requests", async () => {
    const visitor = await session();
    const auth = `Bearer ${visitor.credential}`;
    dependencies.selector.select.mockImplementationOnce(async (request) => {
      await save(true, false);
      return { status: "ANSWER", passageIds: [request.candidates[0].id] };
    });
    const response = await submitChatbotQuestion(
      visitor.id,
      auth,
      { turnId: chatbotId(800), question: "Public question 1" },
      dependencies,
    );
    expect(response.answer.reason).toBe("SERVICE_FAILURE");
    expect(response.answer.passages).toEqual([]);
    expect(response.caseId).toBeTruthy();
    await submitChatbotQuestion(
      visitor.id,
      auth,
      { turnId: chatbotId(801), question: "Public question 1 again" },
      dependencies,
    );
    expect(dependencies.selector.select).toHaveBeenCalledTimes(1);
  });
});
