import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: () => database }));
import type { FormField } from "@/modules/forms/FormTypes";
import { calculateFormScores } from "@/modules/forms/engine/FormScoring";
import { readWorkflowStageApplications } from "@/modules/workflows/infrastructure/WorkflowStageApplicationsRepository";
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
  if (!client) return;
  await client.query(`DROP SCHEMA IF EXISTS ${funnelTestSchema} CASCADE`);
  await client.end();
});

async function applicationScore() {
  const result = await readWorkflowStageApplications(
    funnelId(80),
    funnelId(950),
    {
      stageKey: "FINANCIAL",
      page: 1,
      pageSize: 25,
    },
  );
  return result.items.find((item) => item.reference === "APP-6");
}

function scoringFields(
  method: "SUM" | "AVERAGE" | "WEIGHTED_SUM" | "WEIGHTED_AVERAGE",
  normalization: "RAW" | "PERCENTAGE",
): FormField[] {
  const base = {
    sectionId: funnelId(70),
    columnSpan: 1 as const,
    required: true,
    order: 1,
  };
  return [
    { ...base, key: "A", label: "A", type: "SCORE", minimum: 0, maximum: 10 },
    { ...base, key: "B", label: "B", type: "SCORE", minimum: 0, maximum: 20 },
    {
      ...base,
      key: "TOTAL",
      label: "Total",
      type: "SCORING_AGGREGATE",
      scoringAggregate: {
        method,
        normalization,
        precision: 2,
        missing: "REQUIRE_ALL",
        sources: [
          { fieldKey: "A", weight: 1 },
          { fieldKey: "B", weight: 3 },
        ],
      },
    },
  ];
}

async function saveResponse(
  fields: FormField[],
  values: Record<string, unknown>,
) {
  await client!.query(
    "UPDATE app_form_responses SET definition_snapshot = $1, values = $2 WHERE id = $3",
    [JSON.stringify({ fields }), JSON.stringify(values), funnelId(61)],
  );
}

async function rollbackAfter(work: () => Promise<void>) {
  await client!.query("BEGIN");
  try {
    await work();
  } finally {
    await client!.query("ROLLBACK");
  }
}

describe.skipIf(!url)("configured stage aggregate results", () => {
  it.each([
    ["SUM", "RAW", 18, 30],
    ["AVERAGE", "RAW", 9, 15],
    ["WEIGHTED_SUM", "RAW", 38, 70],
    ["WEIGHTED_AVERAGE", "RAW", 9.5, 17.5],
    ["SUM", "PERCENTAGE", 130, 200],
    ["AVERAGE", "PERCENTAGE", 65, 100],
    ["WEIGHTED_SUM", "PERCENTAGE", 230, 400],
    ["WEIGHTED_AVERAGE", "PERCENTAGE", 57.5, 100],
  ] as const)(
    "preserves %s with %s normalization",
    async (method, normalization, value, maximum) => {
      await rollbackAfter(async () => {
        const fields = scoringFields(method, normalization);
        await saveResponse(
          fields,
          calculateFormScores(fields, { A: 8, B: 10 }),
        );
        expect(await applicationScore()).toMatchObject({
          averageScore: value,
          scoreMaximum: maximum,
          scoreUnit: normalization === "RAW" ? "POINTS" : "PERCENTAGE",
        });
      });
    },
  );

  it("averages completed reviewer aggregates equally", async () => {
    await rollbackAfter(async () => {
      await client!.query(
        `INSERT INTO app_workflow_tasks
          SELECT $1, stage_instance_id, workflow_task_definition_id, $2,
            form_version_id, status, NULL, result FROM app_workflow_tasks WHERE id = $3`,
        [funnelId(426), funnelId(951), funnelId(406)],
      );
      await client!.query(
        `INSERT INTO app_form_responses
          SELECT $1, $2, $3, status, jsonb_set(values, '{TOTAL}', '6.5'), definition_snapshot
          FROM app_form_responses WHERE id = $4`,
        [funnelId(62), funnelId(426), funnelId(951), funnelId(61)],
      );
      expect(await applicationScore()).toMatchObject({
        averageScore: 5,
        scoreMaximum: 10,
      });
    });
  });

  it.each(["missing", "incomplete", "standalone"])(
    "does not invent a score for %s aggregates",
    async (kind) => {
      await rollbackAfter(async () => {
        const fields = scoringFields("AVERAGE", "RAW");
        const values: Record<string, unknown> = { A: 8, B: 10, TOTAL: 9 };
        if (kind === "missing") delete values.TOTAL;
        if (kind === "incomplete") delete values.B;
        if (kind === "standalone") fields.pop();
        await saveResponse(fields, values);
        expect(await applicationScore()).toMatchObject({
          averageScore: null,
          scoreMaximum: null,
        });
      });
    },
  );

  it("uses the available source scale when the rule permits partial scoring", async () => {
    await rollbackAfter(async () => {
      const fields = scoringFields("SUM", "RAW");
      fields[2].scoringAggregate!.missing = "USE_AVAILABLE";
      await saveResponse(fields, calculateFormScores(fields, { A: 8 }));
      expect(await applicationScore()).toMatchObject({
        averageScore: 8,
        scoreMaximum: 10,
      });
    });
  });

  it("does not average results on incompatible scales", async () => {
    await rollbackAfter(async () => {
      await client!.query(
        `INSERT INTO app_workflow_tasks
          SELECT $1, stage_instance_id, workflow_task_definition_id, $2,
            form_version_id, status, NULL, result FROM app_workflow_tasks WHERE id = $3`,
        [funnelId(426), funnelId(951), funnelId(406)],
      );
      const fields = scoringFields("AVERAGE", "PERCENTAGE");
      await client!.query(
        "INSERT INTO app_form_responses VALUES ($1,$2,$3,'COMPLETED',$4,$5)",
        [
          funnelId(62),
          funnelId(426),
          funnelId(951),
          JSON.stringify(calculateFormScores(fields, { A: 8, B: 10 })),
          JSON.stringify({ fields }),
        ],
      );
      expect(await applicationScore()).toMatchObject({
        averageScore: null,
        scoreMaximum: null,
      });
    });
  });

  it("applies the Comment constraint migration twice and preserves existing textareas", async () => {
    await rollbackAfter(async () => {
      await client!.query(
        "CREATE TEMP TABLE app_form_fields (type text, min_length integer, max_length integer)",
      );
      await client!.query(
        "INSERT INTO app_form_fields VALUES ('TEXTAREA', 1, 100)",
      );
      const migration = await readFile(
        new URL(
          "../../../drizzle/0213_form_comment_field.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await client!.query(migration);
      await client!.query(migration);
      await client!.query(
        "INSERT INTO app_form_fields VALUES ('COMMENT', 3, 50)",
      );
      expect(
        (await client!.query("SELECT type FROM app_form_fields ORDER BY type"))
          .rows,
      ).toEqual([{ type: "COMMENT" }, { type: "TEXTAREA" }]);
      await expect(
        client!.query("INSERT INTO app_form_fields VALUES ('COMMENT', 50, 3)"),
      ).rejects.toThrow("app_form_fields_length_limits_check");
    });
  });
});
