import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { Client } from "pg";
import { createLocalReq, getPayload, type Payload } from "payload";
import type { MigrateUpArgs } from "@payloadcms/db-postgres";

import config from "@/payload.config";
import { migrations } from "@/payload/migrations";
import { createFundingOverviewSectorTables } from "@/payload/migrations/20261007_200000_independent_funding_overview";
import { paragraphsToRichText } from "@/modules/content/ContentRichText";
import { defaultFundingOverviewBlocks, defaultFocusSectorBlocks } from "@/modules/content/FundingOverviewDefaults";

export const testContext = { skipPublishCapability: true, skipRevalidation: true };

export async function openFundingOverviewFixture(connectionString: string) {
  // The test requires a disposable, empty database and never resets an existing one.
  const client = new Client({ connectionString });
  await client.connect();
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  if (tables.rowCount) throw new Error("Overview tests require an empty disposable database");
  const dialect = new PgDialect();
  const db = {
    execute: async (statement: SQL) => {
      const query = dialect.sqlToQuery(statement);
      return client.query(query.sql, query.params);
    },
  } as unknown as MigrateUpArgs["db"];
  for (const migration of migrations.slice(0, -1)) {
    await migration.up({ db } as MigrateUpArgs);
  }
  await createFundingOverviewSectorTables(db);
  const payload = await getPayload({ config });
  const req = await createLocalReq({ context: testContext }, payload);
  return { client, db, payload, req };
}

export async function seedLegacyOverview(payload: Payload) {
  const pageData = (slug: string, layout: unknown[]) => ({
    slug,
    title: slug,
    content: paragraphsToRichText([slug]),
    layout,
    _status: "published",
    reviewStatus: "approved",
  });
  const support = {
    ...defaultFundingOverviewBlocks[0],
    eyebrow: "Published support",
  };
  const priorities = {
    ...defaultFundingOverviewBlocks[1],
    eyebrow: "Published priorities",
  };
  const funding = await payload.create({
    collection: "pages", overrideAccess: true, context: testContext,
    data: pageData("funding", [support, priorities]) as never,
  });
  const eligibility = await payload.create({
    collection: "pages", overrideAccess: true, context: testContext,
    data: pageData("eligibility", [{
      ...defaultFocusSectorBlocks[0], eyebrow: "Published focus",
    }]) as never,
  });
  const sectors = [];
  for (const [order, label] of ["Second sector", "First sector"].entries()) {
    sectors.push(await payload.create({
      collection: "eligibility-content", overrideAccess: true, context: testContext,
      data: { label, description: "Priority area", kind: "focusSector", order,
        _status: "published", reviewStatus: "approved" },
    }));
  }
  await payload.update({
    collection: "pages", id: funding.id, draft: true,
    overrideAccess: true, context: testContext,
    data: { layout: [{ ...support, eyebrow: "Pending support" },
      { ...priorities, eyebrow: "Pending priorities" }], _status: "draft" },
  });
  await payload.update({
    collection: "eligibility-content", id: sectors[0].id, draft: true,
    overrideAccess: true, context: testContext,
    data: { label: "Pending sector", _status: "draft" },
  });
  await payload.update({
    collection: "pages", id: eligibility.id, draft: true,
    overrideAccess: true, context: testContext,
    data: { layout: [{
      ...defaultFocusSectorBlocks[0], eyebrow: "Pending focus",
    }], _status: "draft" },
  });
  return { funding, sectors };
}
