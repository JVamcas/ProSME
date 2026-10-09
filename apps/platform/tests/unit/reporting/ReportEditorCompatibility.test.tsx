import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PostgreSQL } from "dt-sql-parser";
import { ReportSqlEditor } from "@/modules/reporting/ui/definitions/ReportSqlEditor";
import { reportSqlCompletions } from "@/modules/reporting/ui/definitions/ReportSqlCompletions";
import { applicationReportDataset as dataset } from "../../support/ReportDatasetFixture";

const parser = new PostgreSQL();

describe("pinned PostgreSQL editor compatibility", () => {
  it.each([
    "SELECT reference FROM app_reporting_dataset_applications_v1 WHERE requested_grant_amount >= $1::numeric",
    "WITH selected AS (SELECT reference FROM app_reporting_dataset_applications_v1 WHERE lifecycle_status = $1::text) SELECT reference FROM selected LIMIT $2",
  ])("accepts native positional parameters in editor diagnostics: %s", (sql) => {
    expect(parser.validate(sql)).toEqual([]);
  });
  it("records the upstream ANY-array diagnostic limitation without treating editor diagnostics as server policy", () => {
    const errors = parser.validate(
      "SELECT reference FROM app_reporting_dataset_applications_v1 WHERE lifecycle_status = ANY($1::text[])",
    );
    expect(errors.some((error) => error.message.includes("ANY"))).toBe(true);
  });
  it("provides invalid-SQL diagnostics", () => {
    expect(parser.validate("SELECT FROM WHERE")).not.toEqual([]);
  });
  it("loads the controlled React 19 shell during SSR without importing browser-only Monaco", () => {
    expect(
      renderToStaticMarkup(
        <ReportSqlEditor
          value="SELECT reference"
          onChange={() => undefined}
          dataset={dataset}
          parameters={[]}
        />,
      ),
    ).toContain("h-80");
  });
  it("limits completion to the selected dataset, alias columns and ordered parameters", () => {
    const suggestions = reportSqlCompletions(
      dataset,
      [
        {
          name: "amount",
          position: 1,
          type: "decimal",
          nullable: false,
          binding: "value",
        },
      ],
      new Map([
        ["a", "app_reporting_dataset_applications_v1"],
        ["users", "app_users"],
      ]),
    );
    expect(suggestions).toContainEqual(
      expect.objectContaining({ label: "a.requested_grant_amount", detail: "numeric nullable" }),
    );
    expect(suggestions).toContainEqual(
      expect.objectContaining({ label: "$1", detail: "amount: decimal" }),
    );
    expect(JSON.stringify(suggestions)).not.toContain("app_users");
    expect(JSON.stringify(suggestions)).not.toContain("website_metrics");
  });
});
