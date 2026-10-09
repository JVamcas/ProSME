import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  getReport,
  putReport,
  runReport,
  getReportRun,
  getReportRuns,
} from "@/modules/reporting/ServerReportService";
import {
  putReportTemplate,
  checkReportTemplate,
} from "@/modules/reporting/ServerReportDefinitionService";
import { processReportGeneration } from "@/modules/reporting/ServerReportGenerationService";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";
import { websiteAnalyticsTemplate } from "@/modules/reporting/application/bootstrap/WebsiteAnalyticsTemplate";
import * as worker from "@/modules/reporting/infrastructure/ReportRunWorkerRepository";
import {
  reportingRuntimeDatabaseEnabled as enabled,
  reportingRuntimePool as pool,
  installReportingRuntimeFixture,
  MemoryReportStorage,
} from "../../support/ReportingRuntimeDatabaseFixture";

let actor: AuthenticatedUser;
const dates = { startDate: "2026-10-01", endDate: "2026-10-06" };
const storage = new MemoryReportStorage();
beforeAll(async () => {
  if (enabled) actor = await installReportingRuntimeFixture();
});
afterAll(async () => {
  await pool.end();
  vi.unstubAllEnvs();
});
async function createReport(website = false) {
  const template = await putReportTemplate(actor, {
    ...(website ? websiteAnalyticsTemplate : applicationExportTemplate),
    key: `recover-${crypto.randomUUID()}`,
  });
  await checkReportTemplate(
    actor,
    template.id,
    { rowVersion: 1, values: dates },
    true,
  );
  const created = await putReport(actor, {
    key: `recover-${crypto.randomUUID()}`,
    name: "Recovery fixture",
    description: "Fixture for interrupted report recovery.",
    templateId: template.id,
    templateVersion: 1,
    defaults: { period: "explicit", values: dates },
    format: "CSV",
  });
  return getReport(actor, created.id);
}
(enabled ? describe : describe.skip)("durable reporting recovery", () => {
  it("resumes the original run after a crash before upload and emits the started event only once", async () => {
    const report = await createReport();
    const queued = await runReport(actor, report.id, {
      idempotencyKey: crypto.randomUUID(),
      values: {},
    });
    const claimed = (await worker.claimReportRun())!;
    await worker.startReportRun(claimed);
    await worker.checkpointReportOutput(claimed, {
      kind: "OUTPUT",
      objectKey: `reporting/runs/${queued.id}/missing.csv`,
      filename: "missing.csv",
      contentType: "text/csv",
      bytes: 10,
      checksum: "unwritten",
      rows: 1,
    });
    await pool.query(
      "UPDATE app_reporting_report_runs SET lease_until = now() - interval '1 second' WHERE id = $1",
      [queued.id],
    );
    expect(await processReportGeneration(storage)).toMatchObject({
      succeeded: 1,
    });
    const detail = await getReportRun(actor, report.id, queued.id);
    expect(detail.events.map((event) => event.key)).toEqual([
      "reporting.generation.started",
      "reporting.generation.completed",
    ]);
    expect(detail.artifacts).toHaveLength(1);
    expect(detail.run.status).toBe("SUCCEEDED");
  });
  it("retains an uploaded checkpoint after a database finalization failure", async () => {
    const report = await createReport();
    const queued = await runReport(actor, report.id, {
      idempotencyKey: crypto.randomUUID(),
      values: {},
    });
    const finalize = vi
      .spyOn(worker, "completeReportRun")
      .mockRejectedValueOnce(new Error("Database connection unavailable"));
    expect(await processReportGeneration(storage)).toMatchObject({
      failed: 0,
      preparing: 1,
    });
    finalize.mockRestore();
    let detail = await getReportRun(actor, report.id, queued.id);
    expect(detail.run.status).toBe("RUNNING");
    expect(detail.events).toHaveLength(1);
    expect(storage.objects.size).toBeGreaterThan(0);
    await pool.query(
      "UPDATE app_reporting_report_runs SET lease_until = now() - interval '1 second' WHERE id = $1",
      [queued.id],
    );
    expect(await processReportGeneration(storage)).toMatchObject({
      succeeded: 1,
    });
    detail = await getReportRun(actor, report.id, queued.id);
    expect(detail.run.status).toBe("SUCCEEDED");
    expect(detail.events).toHaveLength(2);
  });
  it("binds the immutable server run timestamp after PostgreSQL persistence", async () => {
    const template = await putReportTemplate(actor, {
      key: `timestamp-${crypto.randomUUID()}`,
      name: "Server timestamp",
      description: "Application references with the server run timestamp.",
      definition: {
        datasetKey: "application-data",
        datasetVersion: 1,
        sql: "SELECT reference, $1::timestamptz AS run_at FROM app_reporting_dataset_applications_v1",
        parameters: [
          {
            name: "runAt",
            position: 1,
            type: "timestamp",
            nullable: false,
            binding: "run-at",
          },
        ],
        columns: [
          { name: "reference", type: "text" },
          { name: "run_at", type: "timestamptz" },
        ],
        formats: ["CSV"],
      },
    });
    await checkReportTemplate(
      actor,
      template.id,
      { rowVersion: 1, values: {} },
      true,
    );
    const configured = await putReport(actor, {
      key: `timestamp-${crypto.randomUUID()}`,
      name: "Server timestamp",
      description: "Application references with the server run timestamp.",
      templateId: template.id,
      templateVersion: 1,
      defaults: { period: "explicit", values: {} },
      format: "CSV",
    });
    const queued = await runReport(actor, configured.id, {
      idempotencyKey: crypto.randomUUID(),
      values: {},
    });
    expect(await processReportGeneration(storage)).toMatchObject({
      succeeded: 1,
    });
    const detail = await getReportRun(actor, configured.id, queued.id);
    const output = (
      await storage.read(detail.artifacts[0].objectKey)
    ).toString();
    const timestamp = output.match(/,"([^"\r\n]+)"\r\n$/)![1];
    expect(new Date(timestamp).toISOString()).toBe(detail.run.runAt);
  });
  it("filters historical runs by their pinned dataset after a report changes source", async () => {
    const report = await createReport();
    const queued = await runReport(actor, report.id, {
      idempotencyKey: crypto.randomUUID(),
      values: {},
    });
    await processReportGeneration(storage);
    const website = await createReport(true);
    await putReport(
      actor,
      {
        key: report.key,
        name: report.name,
        description: report.description,
        rowVersion: report.rowVersion,
        templateId: website.templateId,
        templateVersion: website.templateVersion,
        defaults: website.defaults,
        format: website.format,
      },
      report.id,
    );
    const restricted = {
      ...actor,
      capabilities: new Set(
        [...actor.capabilities].filter(
          (permission) =>
            permission !== permissionCodes.fundingApplicationAllRead,
        ),
      ),
    };
    expect(
      await getReportRuns(restricted, report.id, {
        search: "",
        page: 1,
        pageSize: 10,
      }),
    ).toMatchObject({ items: [], total: 0 });
    await expect(
      getReportRun(restricted, report.id, queued.id),
    ).rejects.toThrow("Missing");
  });
  it("keeps unavailable exact-period website sources preparing and pins property/timezone context", async () => {
    const report = await createReport(true);
    const queued = await runReport(actor, report.id, {
      idempotencyKey: crypto.randomUUID(),
      values: {},
    });
    expect(await processReportGeneration(storage)).toMatchObject({
      preparing: 1,
    });
    let detail = await getReportRun(actor, report.id, queued.id);
    expect(detail.run.status).toBe("PREPARING_SOURCE");
    expect(detail.run.websiteScope).toEqual({
      propertyId: "123",
      collectionStart: "2026-10-01",
    });
    expect(detail.events).toEqual([]);
    const registered = await pool.query(
      "SELECT start_date::text, end_date::text, include_panels FROM app_reporting_website_queries",
    );
    expect(registered.rows).toContainEqual({
      start_date: dates.startDate,
      end_date: dates.endDate,
      include_panels: true,
    });
    vi.stubEnv("GA_PROPERTY_ID", "456");
    await pool.query(
      "UPDATE app_reporting_report_runs SET available_at = now() WHERE id = $1",
      [queued.id],
    );
    expect(await processReportGeneration(storage)).toMatchObject({ failed: 1 });
    detail = await getReportRun(actor, report.id, queued.id);
    expect(detail.run.error).toContain("configuration changed");
    vi.stubEnv("GA_PROPERTY_ID", "123");
  });
});
