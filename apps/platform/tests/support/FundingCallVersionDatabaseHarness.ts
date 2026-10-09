import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, expect, vi } from "vitest";
import { getDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { publishApprovedFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallPublicationRepository";
import { changeFundingCallGovernance } from "@/modules/funding-calls/infrastructure/FundingCallGovernanceRepository";
import { createApplicationDraft } from "@/modules/applications/infrastructure/ApplicationCreationRepository";
import {
  prepareVersionDatabase,
  seedVersionCall,
  versionActorId,
  versionApproverId,
  versionOwnerId,
} from "./FundingCallVersionDatabaseFixture";

export const enabled =
  process.env.RUN_FUNDING_CALL_VERSION_DATABASE_TESTS === "true";
const testSchema = `call_version_${randomUUID().replaceAll("-", "")}`;
const connectionString = process.env.DATABASE_URL;
const provision = enabled ? new pg.Pool({ connectionString }) : null;
export const pool = enabled
  ? new pg.Pool({ connectionString, options: `-c search_path=${testSchema}` })
  : null;
let created = false;
let beforeMigration: ((pool: pg.Pool) => Promise<void>) | undefined;

export function beforeVersionMigration(work: (pool: pg.Pool) => Promise<void>) {
  beforeMigration = work;
}

beforeAll(async () => {
  if (!pool || !provision) return;
  await provision.query(`CREATE SCHEMA ${testSchema}`);
  created = true;
  await prepareVersionDatabase(pool, beforeMigration);
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

export function command(
  callId: string,
  rowVersion: number,
  actorId = versionActorId,
) {
  return {
    actorId,
    correlationId: randomUUID(),
    expectedRowVersion: rowVersion,
    fundingCallId: callId,
    idempotencyKey: randomUUID(),
    now: new Date(),
  };
}

export async function publishInitialCall() {
  const binding = await seedVersionCall(pool!);
  expect(
    (await publishApprovedFundingCall(command(binding.callId, 1))).kind,
  ).toBe("published");
  return binding;
}

export async function approveReplacement(id: string) {
  let call = (await readFundingCallById(id))!;
  expect(
    (
      await changeFundingCallGovernance({
        ...command(id, call.rowVersion),
        command: "SUBMIT_FOR_APPROVAL",
      })
    ).kind,
  ).toBe("transitioned");
  call = (await readFundingCallById(id))!;
  expect(
    (
      await changeFundingCallGovernance({
        ...command(id, call.rowVersion, versionApproverId),
        command: "APPROVE",
      })
    ).kind,
  ).toBe("transitioned");
  return (await readFundingCallById(id))!;
}

export function createDraft(id: string, ownerId = versionOwnerId) {
  return createApplicationDraft({
    actorUserId: ownerId,
    correlationId: randomUUID(),
    fundingCallIdOrSlug: id,
    idempotencyKey: randomUUID(),
    requestFingerprint: randomUUID(),
  });
}
