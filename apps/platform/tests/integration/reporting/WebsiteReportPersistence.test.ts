import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import {
  reportingConfiguration,
  reportingDatabaseEnabled,
} from "../../support/WebsiteAnalyticsDatabaseFixture";
import {
  createWebsiteReportDatabaseFixture,
  reportRecipientId,
} from "../../support/WebsiteReportDatabaseFixture";
import {
  claimDueWebsiteReport,
  deferWebsiteReport,
  type ClaimedWebsiteReport,
} from "@/modules/reporting/infrastructure/WebsiteReportClaimRepository";
import { readCompletedWebsiteReportSources } from "@/modules/reporting/infrastructure/WebsiteReportSourceRepository";
import { finalizeWebsiteReport } from "@/modules/reporting/infrastructure/WebsiteReportFinalizeRepository";
import {
  findSavedWebsiteReport,
  listSavedWebsiteReports,
} from "@/modules/reporting/infrastructure/WebsiteReportReadRepository";
import { updateWebsiteReportSchedule } from "@/modules/reporting/infrastructure/WebsiteReportScheduleRepository";
import { captureWebsiteReportOccurrence } from "@/modules/notifications/application/ServerWebsiteReportOccurrenceService";
import { buildWebsiteReportSnapshot } from "@/modules/reporting/application/WebsiteReportSnapshot";
import { isCurrentWebsiteReportRecipient } from "@/modules/notifications/infrastructure/WebsiteReportRecipientRepository";
import {
  claimDueNotificationOccurrences,
  loadClaimedNotificationDeliveries,
} from "@/modules/notifications/infrastructure/NotificationDispatchRepository";

const fixture = createWebsiteReportDatabaseFixture();
beforeAll(() => fixture.prepare());
beforeEach(async () => {
  if (reportingDatabaseEnabled) await fixture.reset();
});
afterAll(() => fixture.finish());

async function finalize(job: ClaimedWebsiteReport, fail = false) {
  const completed = await readCompletedWebsiteReportSources(job);
  if (!completed) throw new Error("No completed sources");
  const generatedAt = new Date().toISOString();
  const snapshot = buildWebsiteReportSnapshot(job, completed, generatedAt);
  return finalizeWebsiteReport({
    job,
    snapshot,
    generatedAt,
    nextDueAt: new Date("2099-11-03T07:00:00Z"),
    capture: async (transaction) => {
      const result = await captureWebsiteReportOccurrence(
        transaction,
        job.configuration.eventKey,
        {
          reportId: job.id,
          frequency: job.frequency,
          startDate: job.startDate,
          endDate: job.endDate,
          timezone: reportingConfiguration.timezone,
          generatedAt,
          reportSummary: snapshot.summary,
          sourceNotes: snapshot.sourceNotes,
        },
      );
      if (fail) throw new Error("Crash after capture");
      return result;
    },
  });
}

(reportingDatabaseEnabled ? describe : describe.skip)(
  "website report PostgreSQL persistence and outbox",
  () => {
    it("starts disabled and prevents concurrent duplicate claims while recovering expired leases", async () => {
      expect(await claimDueWebsiteReport(reportingConfiguration)).toBeNull();
      await fixture.due();
      const first = await claimDueWebsiteReport(reportingConfiguration);
      expect(first?.endDate).toBe("2026-09-30");
      expect(await claimDueWebsiteReport(reportingConfiguration)).toBeNull();
      await fixture.client.query(
        "UPDATE app_reporting_runs SET lease_expires_at = now() - interval '1 second'",
      );
      const reclaimed = await claimDueWebsiteReport(reportingConfiguration);
      expect(reclaimed?.id).toBe(first?.id);
      expect(reclaimed?.leaseToken).not.toBe(first?.leaseToken);
      await fixture.sources(reclaimed!);
      expect(await finalize(first!)).toBe(false);
      expect(await finalize(reclaimed!)).toBe(true);
    });

    it("requires every exact source after finalization and retains failed sources without fabricating zeros", async () => {
      await fixture.due();
      const job = (await claimDueWebsiteReport(reportingConfiguration))!;
      expect(await readCompletedWebsiteReportSources(job)).toBeNull();
      const old = new Date(Date.parse(job.dueAt) - 1000).toISOString();
      const identity = await fixture.sources(job, old);
      expect(await readCompletedWebsiteReportSources(job)).toBeNull();
      await fixture.sources(job);
      await fixture.client.query(
        "UPDATE app_reporting_website_queries SET failures = '{\"traffic\":true}' WHERE query_key = $1",
        [identity.queryKey],
      );
      expect(await readCompletedWebsiteReportSources(job)).toBeNull();
      await fixture.client.query(
        "UPDATE app_reporting_website_queries SET failures = '{}' WHERE query_key = $1",
        [identity.queryKey],
      );
      expect(
        (await readCompletedWebsiteReportSources(job))?.sources?.traffic.data
          ?.visitors,
      ).toBe(100);
    });

    it("rolls back snapshot, outbox and cursor together after a crash; retries once and remains readable after restart", async () => {
      await fixture.due();
      const job = (await claimDueWebsiteReport(reportingConfiguration))!;
      await fixture.sources(job);
      await expect(finalize(job, true)).rejects.toThrow("Crash after capture");
      expect(
        (
          await fixture.client.query(
            "SELECT count(*)::int AS count FROM app_notification_outbox",
          )
        ).rows[0].count,
      ).toBe(0);
      expect(
        (
          await fixture.client.query(
            "SELECT next_period_start::text FROM app_reporting_schedules WHERE frequency = 'MONTHLY'",
          )
        ).rows[0].next_period_start,
      ).toBe("2026-09-01");
      expect(await finalize(job)).toBe(true);
      expect(await finalize(job)).toBe(false);
      const report = await findSavedWebsiteReport(job.id);
      expect(report).toMatchObject({
        state: "GENERATED",
        deliveryState: "PENDING",
        snapshot: { metrics: { traffic: { data: { visitors: 100 } } } },
      });
      await expect(
        fixture.client.query(
          "UPDATE app_reporting_runs SET snapshot = '{}' WHERE id = $1",
          [job.id],
        ),
      ).rejects.toThrow("immutable");
      await fixture.reconnect();
      expect((await findSavedWebsiteReport(job.id))?.snapshot).toEqual(
        report?.snapshot,
      );
    });

    it("rolls back capture when recipients lose access and revalidates designated recipients before retries", async () => {
      await fixture.due();
      const job = (await claimDueWebsiteReport(reportingConfiguration))!;
      await fixture.sources(job);
      const input = {
        eventKey: job.configuration.eventKey,
        userId: reportRecipientId,
        email: "reader@example.test",
      };
      expect(await isCurrentWebsiteReportRecipient(input)).toBe(true);
      await fixture.client.query("UPDATE app_users SET status = 'suspended'");
      expect(await isCurrentWebsiteReportRecipient(input)).toBe(false);
      await expect(finalize(job)).rejects.toThrow("active");
      expect(
        (
          await fixture.client.query(
            "SELECT count(*)::int AS count FROM app_notification_outbox",
          )
        ).rows[0].count,
      ).toBe(0);
      await fixture.client.query("UPDATE app_users SET status = 'active'");
      await finalize(job);
      await fixture.client.query(
        "DELETE FROM app_role_capabilities WHERE capability_id IN (SELECT id FROM app_capabilities WHERE code = 'reporting.website-report.read.all')",
      );
      expect(await isCurrentWebsiteReportRecipient(input)).toBe(false);
      await fixture.client.query(
        "INSERT INTO app_role_capabilities SELECT role.id, capability.id FROM app_roles role CROSS JOIN app_capabilities capability ON CONFLICT DO NOTHING",
      );
      await fixture.client.query(
        "DELETE FROM app_notification_event_rule_recipients",
      );
      expect(await isCurrentWebsiteReportRecipient(input)).toBe(false);
    });

    it("pins the report email template and keeps it after retirement", async () => {
      await fixture.due();
      const job = (await claimDueWebsiteReport(reportingConfiguration))!;
      await fixture.sources(job);
      await finalize(job);
      const template = (
        await fixture.client.query(
          "SELECT template_version_id FROM app_notification_deliveries LIMIT 1",
        )
      ).rows[0].template_version_id;
      await fixture.client.query(
        "UPDATE app_notification_template_versions SET status = 'RETIRED' WHERE id = $1",
        [template],
      );
      const now = new Date();
      const claimed = await claimDueNotificationOccurrences({
        batchSize: 10,
        lockTimeoutMs: 120000,
        now,
        owner: "test",
      });
      const deliveries = await loadClaimedNotificationDeliveries({
        now,
        outboxIds: claimed.map((item) => item.id),
        owner: "test",
      });
      expect(deliveries[0].templateVersionId).toBe(template);
      expect(deliveries[0].htmlTemplate).toContain("{{reportSummary}}");
      await fixture.client.query(
        "UPDATE app_notification_template_versions SET status = 'PUBLISHED' WHERE id = $1",
        [template],
      );
    });

    it("projects bounded history with frequency filtering and stable ordering", async () => {
      await fixture.due("BIWEEKLY");
      const first = (await claimDueWebsiteReport(reportingConfiguration))!;
      await fixture.sources(first);
      await finalize(first);
      await fixture.due("MONTHLY");
      const second = (await claimDueWebsiteReport(reportingConfiguration))!;
      await fixture.sources(second);
      await finalize(second);
      const page = await listSavedWebsiteReports({ page: 1, pageSize: 1 });
      expect(page.total).toBe(2);
      expect(page.rows).toHaveLength(1);
      expect(page.rows[0]).not.toHaveProperty("snapshot");
      expect(
        (await listSavedWebsiteReports({ page: 2, pageSize: 1 })).rows[0].id,
      ).not.toBe(page.rows[0].id);
      expect(
        (await listSavedWebsiteReports({ page: 3, pageSize: 1 })).rows,
      ).toEqual([]);
      const filtered = await listSavedWebsiteReports({
        frequency: "MONTHLY",
        page: 1,
        pageSize: 20,
      });
      expect(filtered.total).toBe(1);
      expect(filtered.rows[0].frequency).toBe("MONTHLY");
    });

    it("audits schedule edits, rejects stale versions and preserves the pending cursor", async () => {
      await fixture.due();
      const job = (await claimDueWebsiteReport(reportingConfiguration))!;
      const input = {
        id: job.scheduleId,
        actorId: reportRecipientId,
        timezone: "Africa/Windhoek",
        values: {
          expectedVersion: 1,
          anchorDate: "2026-09-01",
          sendTime: "09:00",
          finalizationDelayHours: 48,
          enabled: false,
        },
      };
      const paused = await updateWebsiteReportSchedule(input);
      expect(paused).toMatchObject({
        enabled: false,
        version: 2,
        nextPeriodStart: "2026-09-01",
      });
      expect(
        (
          await fixture.client.query(
            "SELECT count(*)::int AS count FROM app_authorization_audit_entries",
          )
        ).rows[0].count,
      ).toBe(1);
      await expect(updateWebsiteReportSchedule(input)).rejects.toThrow(
        "changed",
      );
      await expect(
        updateWebsiteReportSchedule({
          ...input,
          values: { ...input.values, expectedVersion: 2, sendTime: "10:00" },
        }),
      ).rejects.toThrow("pending report");
      await deferWebsiteReport(job, "Waiting");
      expect(await claimDueWebsiteReport(reportingConfiguration)).toBeNull();
    });
  },
);
