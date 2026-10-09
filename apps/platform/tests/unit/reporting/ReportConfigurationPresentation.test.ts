import { describe, expect, it } from "vitest";
import type { ConfiguredReport } from "@/modules/reporting/domain/Report";
import type { ReportParameterDefinition } from "@/modules/reporting/domain/ReportParameters";
import { reportSavedParameterValue } from "@/modules/reporting/ui/reports/ReportConfigurationPresentation";
import { applicationAgeingTemplate } from "@/modules/reporting/application/bootstrap/ApplicationAgeingTemplate";

const report: ConfiguredReport = {
  id: "report",
  key: "ageing",
  name: "Ageing",
  description: "Active stage ages.",
  templateId: "template",
  templateVersion: 1,
  ownerId: "owner",
  rowVersion: 1,
  reportVersion: 1,
  format: "XLSX",
  defaults: { period: "explicit", values: {} },
  definition: applicationAgeingTemplate.definition,
};
const parameter: ReportParameterDefinition = {
  name: "filter",
  position: 1,
  type: "text",
  binding: "value",
  nullable: true,
};

describe("saved report parameter presentation", () => {
  it.each([
    [null, "No value"],
    [false, "false"],
    [0, "0"],
    ["", "Empty text"],
    [["a", "b"], '["a","b"]'],
  ])(
    "preserves an explicit saved value %j over a template default",
    (value, label) => {
      const saved = {
        ...report,
        defaults: { period: "explicit" as const, values: { filter: value } },
      };
      expect(
        reportSavedParameterValue(saved, {
          ...parameter,
          defaultValue: "template",
        }).label,
      ).toBe(label);
    },
  );
  it("uses template defaults when the report has no override", () => {
    expect(
      reportSavedParameterValue(report, {
        ...parameter,
        defaultValue: "template",
      }).label,
    ).toBe("template");
    expect(
      reportSavedParameterValue(report, { ...parameter, defaultValue: null })
        .label,
    ).toBe("No value");
    expect(reportSavedParameterValue(report, parameter).label).toBe("Not set");
    expect(
      reportSavedParameterValue(report, { ...parameter, nullable: false })
        .label,
    ).toBe("Not set");
  });
  it("shows saved date overrides with the same precedence as execution", () => {
    const saved = {
      ...report,
      defaults: {
        period: "previous-month" as const,
        values: { startDate: "2026-01-01" },
      },
    };
    expect(
      reportSavedParameterValue(saved, {
        ...parameter,
        name: "startDate",
        type: "date",
      }).label,
    ).toBe("2026-01-01");
  });
  it.each([
    ["previous-month", "startDate", "Previous month start"],
    ["previous-month", "endDate", "Previous month end"],
    ["website-completed", "startDate", "Collection start"],
    ["website-completed", "endDate", "Yesterday"],
  ] as const)(
    "explains relative period %s parameter %s",
    (period, name, label) => {
      expect(
        reportSavedParameterValue(
          { ...report, defaults: { period, values: {} } },
          { ...parameter, name },
        ).label,
      ).toBe(label);
    },
  );
  it.each(["run-at", "source-timezone"] as const)(
    "describes server binding %s without showing a stale saved value",
    (binding) => {
      const saved = {
        ...report,
        defaults: { period: "explicit" as const, values: { filter: "stale" } },
      };
      expect(
        reportSavedParameterValue(saved, { ...parameter, binding }),
      ).toEqual({
        label: binding === "run-at" ? "Run time" : "Source timezone",
        detail: "Set when the report runs",
      });
    },
  );
});
