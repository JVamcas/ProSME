import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: () => database }));
import { readWorkflowStageFunnelCounts } from "@/modules/workflows/infrastructure/WorkflowStageFunnelRepository";
import { readWorkflowStageFunnelScope } from "@/modules/workflows/infrastructure/WorkflowStageFunnelScope";
import { readWorkflowStageApplications } from "@/modules/workflows/infrastructure/WorkflowStageApplicationsRepository";
import { writeWorkflowStageFunnelExport } from "@/modules/workflows/infrastructure/WorkflowStageFunnelExportWriter";
import {
  funnelId,
  funnelTestSchema,
  seedWorkflowStageFunnel,
} from "../../support/WorkflowStageFunnelPostgresFixture";

const url = process.env.STAGE_FUNNEL_DATABASE_URL;
const client = url ? new Client({ connectionString: url }) : null;
const database = client ? drizzle(client) : null;

beforeAll(async () => {
  if (!client) return;
  if (!["127.0.0.1", "localhost"].includes(new URL(url!).hostname)) {
    throw new Error("Use disposable local PostgreSQL.");
  }
  await client.connect();
  await seedWorkflowStageFunnel(client);
});
afterAll(async () => {
  if (client) {
    await client.query(`DROP SCHEMA IF EXISTS ${funnelTestSchema} CASCADE`);
    await client.end();
  }
});

const query = { stageKey: "FINANCIAL", page: 1, pageSize: 25 };

describe.skipIf(!url)("funding call stage funnel on PostgreSQL", () => {
  it("resolves the call from the target application and rejects deleted/missing context", async () => {
    await expect(
      readWorkflowStageFunnelScope(funnelId(101)),
    ).resolves.toMatchObject({ fundingCallId: funnelId(80) });
    await expect(
      readWorkflowStageFunnelScope(funnelId(105)),
    ).resolves.toBeNull();
    await expect(
      readWorkflowStageFunnelScope(funnelId(9999)),
    ).resolves.toBeNull();
  });
  it("combines workflow versions within one funding call, deduplicates returns and includes zero stages", async () => {
    const counts = await readWorkflowStageFunnelCounts(funnelId(80));
    expect(counts.find((item) => item.stageKey === "FINANCIAL")).toMatchObject({
      count: 4,
      name: "FINANCIAL v2",
    });
    expect(counts.find((item) => item.stageKey === "SCREEN")?.count).toBe(1);
    expect(counts.filter((item) => item.stageKey.endsWith("_STAGE"))).toEqual([
      { stageKey: "NEW_STAGE", name: "NEW_STAGE v2", sequence: 3, count: 0 },
      { stageKey: "OLD_STAGE", name: "OLD_STAGE v1", sequence: 3, count: 0 },
    ]);
  });

  it("returns the latest run with submitted business details and excludes other calls and deleted applications", async () => {
    const result = await readWorkflowStageApplications(
      funnelId(80),
      funnelId(950),
      query,
    );
    expect(result.total).toBe(4);
    expect(result.items.map((item) => item.reference)).toEqual([
      "APP-1",
      "APP-7",
      "APP-6",
      "APP-2",
    ]);
    expect(result.items[0]).toMatchObject({
      iterationNumber: 2,
      averageScore: 7,
      scoreMaximum: 10,
      scoreUnit: "POINTS",
      applicantName: "Submitted applicant",
      businessName: "Submitted business",
      registrationNumber: "SNAPSHOT",
      region: "Khomas",
    });
    expect(result.items[0].comments).toContain("Latest recommendation");
    expect(result.items[0].comments).not.toContain("Comment 1");
  });

  it("reads the saved server-calculated aggregate on its original scale", async () => {
    const result = await readWorkflowStageApplications(
      funnelId(80),
      funnelId(950),
      query,
    );
    const form = result.items.find((item) => item.reference === "APP-6");
    expect(form).toMatchObject({
      averageScore: 3.5,
      scoreMaximum: 10,
      scoreUnit: "POINTS",
    });
    expect(form?.comments).not.toContain("Ordinary textarea answer");
    expect(form?.comments).toContain("Form recommendation");
    expect(form?.comments).not.toContain("Comment 6");
  });

  it("keeps unreleased peer evidence hidden from a reviewing actor", async () => {
    const own = await readWorkflowStageApplications(
      funnelId(80),
      funnelId(950),
      query,
    );
    const peer = own.items.find((item) => item.reference === "APP-7");
    expect(peer?.averageScore).toBe(2);
    expect(peer?.comments).not.toContain("Sealed peer comment");
    const observer = await readWorkflowStageApplications(
      funnelId(80),
      funnelId(999),
      query,
    );
    expect(
      observer.items.find((item) => item.reference === "APP-7")?.averageScore,
    ).toBe(3.5);
  });

  it("paginates after deduplicating and retains the total for empty pages", async () => {
    const result = await readWorkflowStageApplications(
      funnelId(80),
      funnelId(950),
      { ...query, page: 2, pageSize: 2 },
    );
    expect(result.items.map((item) => item.reference)).toEqual([
      "APP-6",
      "APP-2",
    ]);
    const empty = await readWorkflowStageApplications(
      funnelId(80),
      funnelId(950),
      { ...query, page: 3, pageSize: 2 },
    );
    expect(empty).toEqual({ total: 4, items: [] });
  });

  it("exports the same latest instances and score/comment visibility as the list", async () => {
    const file = await writeWorkflowStageFunnelExport(
      funnelId(80),
      funnelId(950),
      "FINANCIAL",
      new AbortController().signal,
    );
    const csv = file.body.toString("utf8");
    expect(file.contentType).toContain("text/csv");
    expect(csv).toContain('"Average score"');
    expect(csv).toContain('"3.50 / 10"');
    expect(csv).toContain("Latest recommendation");
    expect(csv).not.toContain("Sealed peer comment");
    expect(csv).not.toContain('"APP-4"');
    expect(csv.match(/"APP-1"/g)).toHaveLength(1);
  });

  it("excludes draft and superseded evidence without dropping the reached application", async () => {
    await client!.query("BEGIN");
    try {
      await client!.query(
        "UPDATE app_workflow_tasks SET status = 'IN_PROGRESS' WHERE id = $1",
        [funnelId(411)],
      );
      await client!.query(
        "UPDATE app_workflow_tasks SET supersedes_task_id = $1 WHERE id = $2",
        [funnelId(402), funnelId(417)],
      );
      const result = await readWorkflowStageApplications(
        funnelId(80),
        funnelId(950),
        query,
      );
      expect(result.total).toBe(4);
      expect(
        result.items.find((item) => item.reference === "APP-1"),
      ).toMatchObject({ averageScore: null, comments: null });
      expect(
        result.items.find((item) => item.reference === "APP-2"),
      ).toMatchObject({ averageScore: null, comments: null });
    } finally {
      await client!.query("ROLLBACK");
    }
  });

  it("releases peer evidence only when the configured review threshold is met", async () => {
    await client!.query("BEGIN");
    try {
      await client!.query(
        "UPDATE app_stage_task_definitions SET review_release = 'THRESHOLD_MET' WHERE id = $1",
        [funnelId(41)],
      );
      await client!.query(
        "INSERT INTO app_workflow_review_threshold_evaluations VALUES ($1,$2,true)",
        [funnelId(307), funnelId(41)],
      );
      const result = await readWorkflowStageApplications(
        funnelId(80),
        funnelId(950),
        query,
      );
      const released = result.items.find((item) => item.reference === "APP-7");
      expect(released?.averageScore).toBe(3.5);
      expect(released?.comments).toContain("Sealed peer comment");
    } finally {
      await client!.query("ROLLBACK");
    }
  });

  it("neutralizes formula-like exported names", async () => {
    await client!.query(
      "UPDATE app_application_submission_snapshots SET canonical_content = $1",
      [JSON.stringify({ applicant: { displayName: "=1+1" } })],
    );
    try {
      const file = await writeWorkflowStageFunnelExport(
        funnelId(80),
        funnelId(950),
        "FINANCIAL",
        new AbortController().signal,
      );
      expect(file.body.toString("utf8")).toContain('"\'=1+1"');
    } finally {
      await client!.query(
        "UPDATE app_application_submission_snapshots SET canonical_content = $1",
        [JSON.stringify({ applicant: { displayName: "Submitted applicant" } })],
      );
    }
  });
});
