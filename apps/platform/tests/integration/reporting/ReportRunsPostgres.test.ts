import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes as p } from "@/auth/authorization/permissions";
import {
  putReportTemplate,
  checkReportTemplate,
} from "@/modules/reporting/ServerReportDefinitionService";
import {
  getReport,
  putReport,
  runReport,
  getReportRun,
} from "@/modules/reporting/ServerReportService";
import { downloadReportArtifact } from "@/modules/reporting/ServerReportArtifactService";
import { processReportGeneration } from "@/modules/reporting/ServerReportGenerationService";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";
import {
  claimReportRun,
  startReportRun,
  checkpointReportOutput,
  failReportRun,
} from "@/modules/reporting/infrastructure/ReportRunWorkerRepository";
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
async function report(format: "CSV" | "XLSX" = "CSV") {
  const template = await putReportTemplate(actor, {
    ...applicationExportTemplate,
    key: `run-${crypto.randomUUID()}`,
  });
  await checkReportTemplate(
    actor,
    template.id,
    { rowVersion: 1, values: dates },
    true,
  );
  const created = await putReport(actor, {
    key: `run-${crypto.randomUUID()}`,
    name: "Run fixture",
    description: "Fixture for private report artifact generation.",
    templateId: template.id,
    templateVersion: 1,
    defaults: { period: "explicit", values: dates },
    format,
  });
  return getReport(actor, created.id);
}
(enabled ? describe : describe.skip)(
  "manual reporting lifecycle and private artifacts",
  () => {
    it.each(["CSV", "XLSX"] as const)(
      "reconciles actual SQL rows into a private %s artifact with exact money",
      async (format) => {
        const configured = await report(format);
        const queued = await runReport(actor, configured.id, {
          idempotencyKey: crypto.randomUUID(),
          values: {},
        });
        expect(await processReportGeneration(storage)).toMatchObject({
          succeeded: 1,
        });
        const detail = await getReportRun(actor, configured.id, queued.id);
        expect(detail.run).toMatchObject({
          status: "SUCCEEDED",
          rows: 1,
          templateVersion: 1,
        });
        expect(detail.events.map((event) => event.key)).toEqual([
          "reporting.generation.started",
          "reporting.generation.completed",
        ]);
        const artifact = detail.artifacts[0];
        const body = await storage.read(artifact.objectKey);
        expect(artifact.bytes).toBe(body.length);
        expect(artifact.checksum).toBe(
          createHash("sha256").update(body).digest("hex"),
        );
        if (format === "CSV") {
          expect(body.toString()).toContain('"Submitted business"');
          expect(body.toString()).toContain('"9999999999999999.99"');
          expect(body.toString().split("\r\n")).toHaveLength(3);
        } else {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.read(Readable.from(body));
          expect(workbook.worksheets[0].rowCount).toBe(2);
          expect(workbook.worksheets[0].getRow(2).getCell(9).value).toBe(
            "9999999999999999.99",
          );
        }
      },
    );
    it("produces a successful zero-row file containing the declared header", async () => {
      const configured = await report();
      const queued = await runReport(actor, configured.id, {
        idempotencyKey: crypto.randomUUID(),
        values: { startDate: "2020-01-01", endDate: "2020-01-02" },
      });
      await processReportGeneration(storage);
      const detail = await getReportRun(actor, configured.id, queued.id);
      expect(detail.run).toMatchObject({ status: "SUCCEEDED", rows: 0 });
      expect(
        (await storage.read(detail.artifacts[0].objectKey))
          .toString()
          .split("\r\n"),
      ).toHaveLength(2);
    });
    it("deduplicates concurrent retries, rejects conflicting values and retains pinned inputs after edits", async () => {
      const configured = await report();
      const request = { idempotencyKey: crypto.randomUUID(), values: {} };
      const runs = await Promise.all([
        runReport(actor, configured.id, request),
        runReport(actor, configured.id, request),
      ]);
      expect(runs[0].id).toBe(runs[1].id);
      await expect(
        runReport(actor, configured.id, {
          ...request,
          values: { startDate: "2020-01-01" },
        }),
      ).rejects.toThrow("different");
      await putReport(
        actor,
        {
          key: configured.key,
          name: "Edited",
          description: "Edited private artifact fixture.",
          rowVersion: 1,
          templateId: configured.templateId,
          templateVersion: 1,
          defaults: {
            period: "explicit",
            values: { startDate: "2020-01-01", endDate: "2020-01-02" },
          },
          format: "XLSX",
        },
        configured.id,
      );
      const pinned = await getReportRun(actor, configured.id, runs[0].id);
      expect(pinned.run).toMatchObject({
        reportVersion: 1,
        format: "CSV",
        values: dates,
      });
      expect((await runReport(actor, configured.id, request)).id).toBe(
        runs[0].id,
      );
      await processReportGeneration(storage);
    });
    it("claims each run once, fences stale workers and recovers uploaded output without SQL regeneration", async () => {
      const configured = await report();
      const queued = await runReport(actor, configured.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      const claims = await Promise.all([claimReportRun(), claimReportRun()]);
      const claimed = claims.find((run) => run !== null)!;
      expect(claims.filter(Boolean)).toHaveLength(1);
      expect(await startReportRun(claimed)).toBe(true);
      const body = Buffer.from('"reference"\r\n"recovered"\r\n');
      const pending = {
        kind: "OUTPUT" as const,
        objectKey: `reporting/runs/${queued.id}/recovery.csv`,
        filename: "recovery.csv",
        contentType: "text/csv",
        bytes: body.length,
        checksum: createHash("sha256").update(body).digest("hex"),
        rows: 1,
      };
      await checkpointReportOutput(claimed, pending);
      await storage.put({ body, objectKey: pending.objectKey });
      await pool.query(
        "UPDATE app_reporting_report_runs SET lease_until = now() - interval '1 second' WHERE id = $1",
        [queued.id],
      );
      expect(await startReportRun(claimed)).toBe(false);
      await processReportGeneration(storage);
      const detail = await getReportRun(actor, configured.id, queued.id);
      expect(detail.run.status).toBe("SUCCEEDED");
      expect(detail.artifacts[0].objectKey).toBe(pending.objectKey);
      expect(detail.events).toHaveLength(2);
      expect(await failReportRun(claimed, "stale worker")).toBe(false);
    });
  },
);
(enabled ? describe : describe.skip)(
  "manual report failure and access enforcement",
  () => {
    it("persists failure when storage is unavailable and retries sanitized error artifacts independently", async () => {
      const configured = await report();
      const queued = await runReport(actor, configured.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      storage.failWrites = true;
      expect(await processReportGeneration(storage)).toMatchObject({
        failed: 1,
      });
      let detail = await getReportRun(actor, configured.id, queued.id);
      expect(detail.run.status).toBe("FAILED");
      expect(detail.run.error).not.toContain("credentials");
      expect(detail.artifacts).toEqual([]);
      expect(detail.events.map((event) => event.key)).toContain(
        "reporting.generation.failed",
      );
      storage.failWrites = false;
      await processReportGeneration(storage);
      detail = await getReportRun(actor, configured.id, queued.id);
      expect(detail.artifacts[0].kind).toBe("ERROR");
      expect(
        (await storage.read(detail.artifacts[0].objectKey)).toString(),
      ).not.toContain("credentials");
      expect(detail.events).toHaveLength(2);
    });
    it("rechecks current source grants before execution and download and enforces artifact/run/report identity", async () => {
      const configured = await report();
      const queued = await runReport(actor, configured.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      await processReportGeneration(storage);
      const detail = await getReportRun(actor, configured.id, queued.id);
      await expect(
        downloadReportArtifact(
          actor,
          crypto.randomUUID(),
          queued.id,
          detail.artifacts[0].id,
          storage,
        ),
      ).rejects.toThrow("not found");
      const revoked = await pool.query(
        `DELETE FROM app_role_capabilities grant_record USING app_capabilities permission
      WHERE grant_record.capability_id = permission.id AND permission.code = $1
      AND grant_record.role_id IN (SELECT role_id FROM app_user_roles WHERE user_id = $2)
      RETURNING grant_record.role_id, grant_record.capability_id`,
        [p.fundingApplicationAllRead, actor.id],
      );
      try {
        await expect(
          downloadReportArtifact(
            actor,
            configured.id,
            queued.id,
            detail.artifacts[0].id,
            storage,
          ),
        ).rejects.toThrow("Missing");
        const pending = await runReport(actor, configured.id, {
          idempotencyKey: crypto.randomUUID(),
          values: {},
        });
        await processReportGeneration(storage);
        const result = await getReportRun(actor, configured.id, pending.id);
        expect(result.run.status).toBe("FAILED");
        expect(result.events.map((event) => event.key)).toEqual([
          "reporting.generation.failed",
        ]);
      } finally {
        for (const row of revoked.rows)
          await pool.query(
            "INSERT INTO app_role_capabilities(role_id, capability_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [row.role_id, row.capability_id],
          );
      }
    });
  },
);
