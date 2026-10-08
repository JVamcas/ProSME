import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  prepareReportStatement,
  reportStatementText,
  validateReportSql,
} from "@/modules/reporting/infrastructure/ReportSqlPolicy";
import { applicationReportDataset as dataset } from "../../support/ReportDatasetFixture";

const relation = "app_reporting_dataset_applications_v1";
const validate = (sql: string, count = 0) => validateReportSql(sql, dataset, count);

describe("PostgreSQL reporting AST policy", () => {
  it("supports bound local calendar bounds through PostgreSQL's timezone built-in", async () => {
    await expect(
      validate(
        `SELECT reference FROM ${relation} WHERE ($1::date::timestamp AT TIME ZONE $2::text) < $3::timestamptz`,
        3,
      ),
    ).resolves.toEqual(["reference"]);
  });
  it("qualifies parsed views while preserving UTF-8 literals, quoted names and CTE references", async () => {
    const sql = `WITH selected AS (SELECT reference FROM "${relation}" WHERE reference = 'École') SELECT reference FROM selected JOIN ${relation} a ON a.reference = selected.reference`;
    expect(await prepareReportStatement(sql, dataset)).toBe(
      sql
        .replace(`FROM "${relation}"`, `FROM public."${relation}"`)
        .replace(`JOIN ${relation}`, `JOIN public.${relation}`),
    );
    expect(
      await reportStatementText(
        `SELECT reference FROM ${relation} WHERE reference = 'École'; -- trailing comment`,
      ),
    ).toBe(`SELECT reference FROM ${relation} WHERE reference = 'École'`);
  });
  it.each([
    `SELECT a.reference, a.requested_grant_amount FROM ${relation} a WHERE a.requested_grant_amount >= $1::numeric ORDER BY a.reference LIMIT $2`,
    `WITH selected AS (SELECT reference, requested_grant_amount FROM ${relation} WHERE lifecycle_status = $1) SELECT reference, sum(requested_grant_amount) AS total FROM selected GROUP BY reference ORDER BY total LIMIT $2`,
    `SELECT a.reference FROM ${relation} a JOIN ${relation} b ON b.application_id = a.application_id WHERE a.lifecycle_status = ANY($1::text[]) LIMIT $2`,
    `SELECT a.reference FROM ${relation} a WHERE EXISTS (SELECT b.reference FROM ${relation} b WHERE b.application_id = a.application_id AND b.lifecycle_status = $1) LIMIT $2`,
  ])("accepts supported reads, CTEs, joins, grouping and bound values: %s", async (sql) => {
    await expect(validate(sql, 2)).resolves.toContain("reference");
  });

  it("accepts explicit UNION result sets and safe aggregate star", async () => {
    await expect(
      validate(
        `SELECT reference FROM ${relation} UNION ALL SELECT reference FROM ${relation} ORDER BY reference`,
      ),
    ).resolves.toEqual(["reference"]);
    await expect(validate(`SELECT count(*) AS total FROM ${relation}`)).resolves.toEqual(["total"]);
  });

  it.each([
    "SELECT reference FROM app_users",
    "SELECT relname FROM pg_catalog.pg_class",
    "SELECT reference FROM other_schema.app_reporting_dataset_applications_v1",
    "SELECT numeric_value FROM app_reporting_dataset_website_metrics_v1",
    `SELECT a.password FROM ${relation} a`,
    `SELECT a.* FROM ${relation} a`,
    `SELECT * FROM ${relation}`,
    `SELECT ${relation} FROM ${relation}`,
    `SELECT reference INTO temporary_report FROM ${relation}`,
    `SELECT reference FROM ${relation} FOR UPDATE`,
    `SELECT reference FROM ${relation}; SELECT 1`,
    `DELETE FROM ${relation} RETURNING reference`,
    `WITH changed AS (DELETE FROM app_users RETURNING id) SELECT reference FROM ${relation}`,
    `WITH leaked AS (SELECT email FROM app_users) SELECT reference FROM ${relation}`,
    `WITH RECURSIVE repeated AS (SELECT reference FROM ${relation}) SELECT reference FROM repeated`,
    `SELECT (SELECT email FROM app_users) AS email FROM ${relation}`,
    `SELECT reference FROM ${relation} WHERE EXISTS (SELECT oid FROM pg_class)`,
    `SELECT pg_sleep(1) AS slept FROM ${relation}`,
    `SELECT set_config('app.reporting_actor','other',true) AS scope FROM ${relation}`,
    `SELECT public.sum(requested_grant_amount) AS amount FROM ${relation}`,
    `SELECT reference::regclass AS internal FROM ${relation}`,
    `SELECT reference FROM ${relation} ORDER BY reference USING OPERATOR(public.<)`,
    `SELECT reference COLLATE public.unsafe AS label FROM ${relation}`,
    `SELECT count(*) OVER () AS total FROM ${relation}`,
    `SELECT reference FROM ${relation} UNION ALL SELECT email FROM app_users`,
    `SELECT reference FROM ${relation}, pg_sleep(1)`,
    `SELECT reference AS duplicated, reference AS duplicated FROM ${relation}`,
  ])("denies unsupported or unsafe structure: %s", async (sql) => {
    await expect(validate(sql)).rejects.toThrow();
  });

  it("uses the parser rather than keyword checks on strings and comments", async () => {
    await expect(
      validate(
        `SELECT reference FROM ${relation} WHERE reference = 'DELETE; pg_sleep(1)' /* app_users */`,
      ),
    ).resolves.toEqual(["reference"]);
  });

  it("requires consecutive declared parameters and explicit calculated aliases", async () => {
    await expect(
      validate(`SELECT reference FROM ${relation} WHERE reference = $2`, 1),
    ).rejects.toThrow("undeclared");
    await expect(validate(`SELECT reference FROM ${relation}`, 1)).rejects.toThrow(
      "Every declared",
    );
    await expect(validate(`SELECT sum(requested_grant_amount) FROM ${relation}`)).rejects.toThrow(
      "alias",
    );
    await expect(validate("SELECT 1 AS value")).rejects.toThrow("selected dataset");
  });
});
