import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import {
  createOwnedBusiness,
  findOwnedBusiness,
  listOwnedBusinesses,
  listOwnedBusinessesForApplication,
  updateOwnedBusiness,
} from "@/modules/businesses/infrastructure/BusinessRepository";

const enabled = process.env.RUN_BUSINESS_SECTOR_DATABASE_TESTS === "true";
const connectionString = process.env.DATABASE_URL;
const testSchema = `business_sector_${randomUUID().replaceAll("-", "")}`;
const provision = enabled ? new pg.Pool({ connectionString }) : null;
const pool = enabled
  ? new pg.Pool({ connectionString, options: `-c search_path=${testSchema}` })
  : null;
const owner = randomUUID();
const other = randomUUID();
const legacy = randomUUID();
let created = false;
const input = {
  businessType: "Company",
  employeeCount: "4",
  establishedYear: "2020",
  legalName: "Synthetic sector business",
  physicalAddress: "Synthetic address",
  region: "Khomas",
  registrationNumber: "SYN-ONLY",
  sector: "Blue economy",
  tradingName: "Synthetic trading",
};

beforeAll(async () => {
  if (!pool || !provision) return;
  await provision.query(`CREATE SCHEMA ${testSchema}`);
  created = true;
  for (const table of [
    "app_users",
    "app_business_profiles",
    "app_profile_audit_entries",
    "app_applications",
  ]) {
    await pool.query(
      `CREATE TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING IDENTITY)`,
    );
  }
  await pool.query(
    "ALTER TABLE app_business_profiles DROP COLUMN IF EXISTS secondary_sector",
  );
  await pool.query(
    "INSERT INTO app_users (id, email, display_name) VALUES ($1, 'owner@example.test', 'Synthetic owner'), ($2, 'other@example.test', 'Synthetic other')",
    [owner, other],
  );
  await pool.query(
    `INSERT INTO app_business_profiles
    (id, user_id, legal_name, business_type, sector, region, physical_address)
    VALUES ($1, $2, 'Legacy sector business', 'Company', 'Legacy local trade', 'Khomas', 'Synthetic address')`,
    [legacy, owner],
  );
  const migration = readFileSync(
    path.resolve(process.cwd(), "drizzle/0184_business_secondary_sector.sql"),
    "utf8",
  );
  await pool.query(migration);
  await pool.query(migration);
  vi.mocked(getDatabase).mockReturnValue(drizzle(pool, { schema }));
}, 60_000);

afterAll(async () => {
  await pool?.end();
  try {
    if (created) await provision?.query(`DROP SCHEMA ${testSchema} CASCADE`);
  } finally {
    await provision?.end();
  }
});

(enabled ? describe : describe.skip)("business sector persistence", () => {
  it("preserves legacy primary text and starts with no secondary sector on repeated migration", async () => {
    expect(await findOwnedBusiness(owner, legacy)).toMatchObject({
      sector: "Legacy local trade",
      secondarySector: null,
    });
  });

  it("persists Other text, clears hidden details and optional secondary, and audits owned writes", async () => {
    const id = await createOwnedBusiness(owner, {
      ...input,
      sector: "OTHER",
      sectorOther: " Custom primary ",
      secondarySector: "OTHER",
      secondarySectorOther: " Custom secondary ",
    });
    expect(await findOwnedBusiness(owner, id)).toMatchObject({
      sector: "Custom primary",
      secondarySector: "Custom secondary",
    });
    expect(await findOwnedBusiness(other, id)).toBeNull();
    expect(await updateOwnedBusiness(other, id, input)).toBeNull();
    expect(
      await updateOwnedBusiness(owner, id, {
        ...input,
        sectorOther: "Hidden old primary",
        secondarySector: "",
        secondarySectorOther: "Hidden old secondary",
      }),
    ).toBe(id);
    const updated = (await findOwnedBusiness(owner, id))!;
    expect(updated).toMatchObject({
      sector: "Blue economy",
      secondarySector: null,
    });
    expect(Object.keys(updated).sort()).toEqual(
      [
        "businessType",
        "createdAt",
        "employeeCount",
        "establishedYear",
        "id",
        "legalName",
        "physicalAddress",
        "region",
        "registrationNumber",
        "secondarySector",
        "sector",
        "tradingName",
        "updatedAt",
      ].sort(),
    );
    const audits = await pool!.query(
      "SELECT action FROM app_profile_audit_entries WHERE entity_id = $1 ORDER BY created_at",
      [id],
    );
    expect(audits.rows.map((row) => row.action)).toEqual([
      "business.created",
      "business.updated",
    ]);
  });

  it("projects sectors with owner and funding-call scope in the application business list", async () => {
    const id = await createOwnedBusiness(owner, {
      ...input,
      legalName: "A listed business",
      secondarySector: "Circular economy",
    });
    const call = randomUUID();
    const currentApplication = randomUUID();
    await pool!.query(
      `INSERT INTO app_applications
      (id, owner_user_id, business_id, funding_opportunity_id, funding_opportunity_title, duplicate_policy)
      VALUES ($1, $2, $3, $4, 'Synthetic call', 'none')`,
      [randomUUID(), owner, id, call],
    );
    const businesses = await listOwnedBusinessesForApplication({
      applicationId: currentApplication,
      fundingOpportunityId: call,
      ownerUserId: owner,
    });
    expect(businesses[0]).toMatchObject({
      id,
      sector: "Blue economy",
      secondarySector: "Circular economy",
      alreadyApplied: true,
    });
    const differentCall = await listOwnedBusinessesForApplication({
      applicationId: currentApplication,
      fundingOpportunityId: randomUUID(),
      ownerUserId: owner,
    });
    expect(differentCall[0]).toMatchObject({ id, alreadyApplied: false });
    expect(await listOwnedBusinesses(other)).toEqual([]);
  });
});
