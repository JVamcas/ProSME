import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { GET, PATCH } from "@/app/api/admin/chatbot/knowledge/resources/route";
import { installChatbotRuntimeFixture } from "../../support/ChatbotRuntimeFixture";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";
import {
  getChatbotResources,
  updateChatbotResources,
} from "@/modules/chatbot/application/ServerChatbotResourceService";
import { permissionCodes } from "@/auth/authorization/permissions";
import { readKnowledgeLease } from "@/modules/chatbot/infrastructure/ChatbotReleaseRepository";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;
beforeEach(async () => {
  if (!url) return;
  fixture = await installChatbotRuntimeFixture(url);
  await fixture.pool.query(
    "INSERT INTO cms_contact_details VALUES (1,'public@example.test','+264 12345','Public office','08:00–17:00','published','approved','PRIVATE EDITOR NOTES','2026-10-10T10:00:00Z')",
  );
});
afterEach(async () => {
  if (fixture) await fixture.close();
});
const save = (resourceKeys: string[], active: boolean, actor = fixture.actor) =>
  updateChatbotResources(actor, { resourceKeys, active });

(url ? describe : describe.skip)(
  "published knowledge resource projections and activation",
  () => {
    it("returns a requested server page and applies authorized bulk changes through HTTP", async () => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(fixture.actor);
      const updated = await PATCH(
        new Request("http://localhost/api/admin/chatbot/knowledge/resources", {
          method: "PATCH",
          body: JSON.stringify({ resourceKeys: ["faq:1"], active: true }),
        }),
      );
      expect(updated.status).toBe(200);
      expect((await updated.json()).data).toEqual({ changed: 1, active: true });
      const page = await GET(
        new Request(
          "http://localhost/api/admin/chatbot/knowledge/resources?page=2&pageSize=10",
        ),
      );
      expect(page.status).toBe(200);
      const data = (await page.json()).data;
      expect(data).toMatchObject({ page: 2, pageSize: 10, total: 128 });
      expect(data.items).toHaveLength(10);
    });
    it("paginates more than 50 FAQs in SQL with exact total and narrow metadata", async () => {
      const pages = await Promise.all(
        [1, 2, 3, 4].map((page) =>
          getChatbotResources(fixture.actor, { page, pageSize: 50 }),
        ),
      );
      expect(pages.map((page) => page.items.length)).toEqual([50, 50, 28, 0]);
      expect(pages.every((page) => page.total === 128)).toBe(true);
      const items = pages.flatMap((page) => page.items);
      expect(new Set(items.map((item) => item.key)).size).toBe(128);
      expect(items.some((item) => item.key === "faq:123")).toBe(true);
      expect(
        items.some((item) =>
          [
            "faq:124",
            "faq:125",
            `funding:${chatbotId(12)}`,
            `funding:${chatbotId(13)}`,
          ].includes(item.key),
        ),
      ).toBe(false);
      expect(
        items.find((item) => item.key === "contact:contact-details"),
      ).toMatchObject({
        name: "Contact details",
        type: "contact",
        active: false,
        lastUpdated: "2026-10-10T10:00:00.000Z",
        url: "/contact",
      });
      const eligibility = items.find(
        (item) => item.key === `eligibility:${chatbotId(10)}`,
      )!;
      expect(eligibility.name).toContain("version 3");
      expect(eligibility.url).toBe(
        `/how-to-apply/funding/${chatbotId(10)}/eligibility`,
      );
      expect(Object.keys(items[0]).sort()).toEqual([
        "active",
        "key",
        "lastUpdated",
        "name",
        "type",
        "url",
      ]);
      expect(JSON.stringify(items)).not.toContain("PRIVATE");
    });
    it("atomically activates/deactivates mixed resources with audit and preserves choices on repeat migration", async () => {
      const keys = [
        `funding:${chatbotId(10)}`,
        `eligibility:${chatbotId(10)}`,
        "faq:1",
        "contact:contact-details",
      ];
      await save(keys, true);
      await save(["faq:1"], false);
      const migration = await readFile(
        new URL(
          "../../../drizzle/0192_chatbot_resource_activation.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await fixture.pool.query(migration);
      const rows = (
        await fixture.pool.query(
          "SELECT resource_key,active FROM app_chatbot_resources ORDER BY resource_key",
        )
      ).rows;
      expect(rows).toHaveLength(4);
      expect(rows.find((row) => row.resource_key === "faq:1").active).toBe(
        false,
      );
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_resource_audit",
          )
        ).rows[0].n,
      ).toBe(2);
      const pages = await Promise.all(
        [1, 2, 3].map((page) =>
          getChatbotResources(fixture.actor, { page, pageSize: 50 }),
        ),
      );
      expect(
        pages
          .flatMap((page) => page.items)
          .filter((row) => row.active)
          .map((row) => row.key)
          .sort(),
      ).toEqual(keys.filter((key) => key !== "faq:1").sort());
    });
    it("denies missing action grants and rejects any unpublished selection without partial writes", async () => {
      await expect(getChatbotResources(chatbotActor([]), {})).rejects.toThrow(
        "Missing required",
      );
      await expect(
        save(
          ["faq:1"],
          true,
          chatbotActor([permissionCodes.chatbotKnowledgeReadAll]),
        ),
      ).rejects.toThrow("Missing required");
      await expect(save(["faq:1", "faq:124"], true)).rejects.toThrow(
        "no longer published",
      );
      await expect(
        save([`eligibility:${chatbotId(12)}`], true),
      ).rejects.toThrow("no longer published");
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_resources",
          )
        ).rows[0].n,
      ).toBe(0);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_resource_audit",
          )
        ).rows[0].n,
      ).toBe(0);
    });
    it("rolls back all resource changes and invalidation when audit fails", async () => {
      const before = await readKnowledgeLease();
      await fixture.pool.query(
        "CREATE FUNCTION fail_resource_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END; $$; CREATE TRIGGER fail_resource BEFORE INSERT ON app_chatbot_resource_audit FOR EACH ROW EXECUTE FUNCTION fail_resource_audit()",
      );
      await expect(save(["faq:1", "faq:2"], true)).rejects.toThrow();
      expect(await readKnowledgeLease()).toEqual(before);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_resources",
          )
        ).rows[0].n,
      ).toBe(0);
    });
    it("serializes competing bulk updates so audit before-state matches the preceding write", async () => {
      await Promise.all([
        save(["faq:1", "faq:2"], true),
        save(["faq:1", "faq:2"], false),
      ]);
      const audit = (
        await fixture.pool.query(
          "SELECT before_state,active FROM app_chatbot_resource_audit ORDER BY created_at,id",
        )
      ).rows;
      const first = audit.find((entry) => entry.before_state.length === 0)!;
      const second = audit.find((entry) => entry.before_state.length === 2)!;
      expect(
        second.before_state.every(
          (row: { active: boolean }) => row.active === first.active,
        ),
      ).toBe(true);
      expect(
        (
          await fixture.pool.query("SELECT active FROM app_chatbot_resources")
        ).rows.every((row) => row.active === second.active),
      ).toBe(true);
    });
  },
);
