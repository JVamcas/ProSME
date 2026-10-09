import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { vi } from "vitest";
import { getDatabase } from "@/platform/database/client";
import { getReportingPool } from "@/platform/database/reporting-pool";
import { installReportingProjectionFixture } from "./ReportingProjectionDatabaseFixture";
import { formContextIds } from "./WorkflowEligibilityFormContextFixture";
import { findReportingPrincipal } from "@/modules/reporting/infrastructure/ReportPrincipalRepository";
import { Readable } from "node:stream";
import type { StreamingDocumentStorage } from "@/integrations/storage/StreamingDocumentStorage";

export const reportingRuntimeDatabaseEnabled =
  process.env.RUN_REPORTING_DATABASE_TESTS === "true";
export const reportingRuntimePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});
export async function installReportingRuntimeFixture() {
  const client = await reportingRuntimePool.connect();
  try {
    await client.query("BEGIN");
    await installReportingProjectionFixture(client);
    await client.query(
      `
      INSERT INTO app_role_capabilities(role_id, capability_id)
      SELECT membership.role_id, permission.id FROM app_user_roles membership
      CROSS JOIN app_capabilities permission WHERE membership.user_id = $1 AND permission.code LIKE 'reporting.%'
      ON CONFLICT DO NOTHING
    `,
      [formContextIds.actor],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  vi.mocked(getDatabase).mockReturnValue(
    drizzle(reportingRuntimePool) as ReturnType<typeof getDatabase>,
  );
  vi.mocked(getReportingPool).mockReturnValue(reportingRuntimePool);
  vi.stubEnv("GA_PROPERTY_ID", "123");
  vi.stubEnv("GA_COLLECTION_START_DATE", "2026-10-01");
  vi.stubEnv("GA_PROPERTY_TIMEZONE", "Africa/Windhoek");
  return (await findReportingPrincipal(formContextIds.actor))!;
}
export class MemoryReportStorage implements StreamingDocumentStorage {
  objects = new Map<string, Buffer>();
  failWrites = false;
  async put(document: { objectKey: string; body: Buffer }) {
    if (this.failWrites) {
      throw new Error("Sensitive storage credentials must not be exposed");
    }
    this.objects.set(document.objectKey, document.body);
  }
  async putStream(document: {
    objectKey: string;
    body: Readable;
    signal: AbortSignal;
  }) {
    const parts: Buffer[] = [];
    for await (const chunk of document.body) {
      document.signal.throwIfAborted();
      parts.push(Buffer.from(chunk));
    }
    await this.put({
      objectKey: document.objectKey,
      body: Buffer.concat(parts),
    });
  }
  readStream(key: string) {
    const body = this.objects.get(key);
    if (!body) {
      const missing = new Error("Missing object") as Error & { code: number };
      missing.code = 404;
      return new Readable({
        read() {
          this.destroy(missing);
        },
      });
    }
    return Readable.from(body);
  }
  async read(key: string) {
    return this.objects.get(key)!;
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
}
