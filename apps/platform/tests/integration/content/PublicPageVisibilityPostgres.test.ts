import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { buildConfig, getPayload, type Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { PublicPageVisibility } from "@/payload/globals/PublicPageVisibility";
import { ContentAuditEntries } from "@/payload/collections/system/ContentAuditEntries";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { createPayloadPostgresAdapter } from "@/platform/database/PayloadPostgresAdapter";
import { up } from "@/payload/migrations/20261012_160000_public_page_visibility";
import { readPublicPageVisibilityInTransaction } from "@/modules/content/infrastructure/PublicPageVisibilityTransactionRepository";

const connectionString = process.env.VISIBILITY_TEST_DATABASE_URL;

describe.skipIf(!connectionString)(
  "public page visibility on disposable PostgreSQL",
  () => {
    let pool: pg.Pool;
    let payload: Payload;
    const editor = {
      id: 1,
      email: "editor@example.test",
      collection: "users",
      capabilities: [cmsPermissionCode("site-settings", "update")],
    };

    beforeAll(async () => {
      pool = new pg.Pool({ connectionString });
      const tables = await pool.query(
        "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'",
      );
      if (tables.rows[0].n)
        throw new Error(
          "Visibility tests require an empty disposable database",
        );
      await up({ db: drizzle(pool) } as never);
      await pool.query(
        "UPDATE cms_public_page_visibility SET visibility = $1",
        [{ news: false }],
      );
      await up({ db: drizzle(pool) } as never);
      const rows = await pool.query(
        "SELECT visibility FROM cms_public_page_visibility",
      );
      expect(rows.rows).toEqual([{ visibility: { news: false } }]);
      payload = await getPayload({
        config: buildConfig({
          secret: "synthetic-visibility-test-secret-only",
          collections: [ContentAuditEntries],
          globals: [PublicPageVisibility],
          db: createPayloadPostgresAdapter({
            pool: { connectionString },
            push: true,
          }),
          typescript: { autoGenerate: false },
        }),
      });
    }, 30000);

    afterAll(async () => {
    await payload?.db.destroy?.();
      await pool?.end();
    });

    it("persists immediate changes with the existing audit hook and narrow projection", async () => {
      const visibility = {
        funding: false,
        "funding.overview.sectors": true,
        news: false,
      };
      await payload.updateGlobal({
        slug: "public-page-visibility",
        data: { visibility },
        user: editor as never,
        overrideAccess: false,
      });
      const document = await payload.findGlobal({
        slug: "public-page-visibility",
        depth: 0,
      });
      expect(document.visibility).toEqual(visibility);
      const audit = await pool.query(
        "SELECT action, actor_email, collection FROM cms_content_audit_entries",
      );
      expect(audit.rows).toContainEqual({
        action: "updated",
        actor_email: editor.email,
        collection: "public-page-visibility",
      });
      await drizzle(pool).transaction(async (transaction) => {
        expect(
          await readPublicPageVisibilityInTransaction(transaction as never),
        ).toEqual(visibility);
      });
    });

    it("rejects unauthorized writes and keeps the previous settings", async () => {
      await expect(
        payload.updateGlobal({
          slug: "public-page-visibility",
          data: { visibility: { news: true } },
          user: {
            ...editor,
            capabilities: [cmsPermissionCode("news", "update")],
          } as never,
          overrideAccess: false,
        }),
      ).rejects.toThrow();
      expect(
        (await payload.findGlobal({ slug: "public-page-visibility" }))
          .visibility,
      ).toMatchObject({ news: false });
    });

    it("rejects invalid toggles without creating an audit entry", async () => {
      const before = await pool.query(
        "SELECT count(*)::int AS n FROM cms_content_audit_entries",
      );
      await expect(
        payload.updateGlobal({
          slug: "public-page-visibility",
          data: { visibility: { home: false } },
          user: editor as never,
          overrideAccess: false,
        }),
      ).rejects.toThrow();
      const after = await pool.query(
        "SELECT count(*)::int AS n FROM cms_content_audit_entries",
      );
      expect(after.rows).toEqual(before.rows);
    });
  },
);
