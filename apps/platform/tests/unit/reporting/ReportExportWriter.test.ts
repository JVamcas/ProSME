import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readFile, access } from "node:fs/promises";
import ExcelJS from "exceljs";
import { createReportExport } from "@/modules/reporting/infrastructure/ReportExportWriter";
import type { ReportTemplateDefinition } from "@/modules/reporting/domain/ReportDefinition";

const definition: ReportTemplateDefinition = {
  datasetKey: "application-data",
  datasetVersion: 1,
  sql: "SELECT reference FROM app_reporting_dataset_applications_v1",
  parameters: [],
  formats: ["CSV", "XLSX"],
  columns: [
    { name: "reference", type: "text" },
    { name: "amount", type: "numeric" },
  ],
};
describe("bounded report export", () => {
  it.each(["CSV", "XLSX"] as const)(
    "preserves column order/precision and makes formula text safe in %s",
    async (format) => {
      const signal = AbortSignal.timeout(10000);
      const writer = await createReportExport(definition, format, signal);
      let path: string | undefined;
      try {
        await writer.onBatch(
          [
            ['  =HYPERLINK("secret")', "-9999999999999999.99"],
            [null, "0.00"],
          ],
          signal,
        );
        const result = await writer.finish();
        path = result.path;
        expect(result.rows).toBe(2);
        if (format === "CSV") {
          const body = await readFile(path, "utf8");
          expect(body).toContain('"reference","amount"');
          expect(body).toContain("'  =HYPERLINK");
          expect(body).toContain('"-9999999999999999.99"');
        } else {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(path);
          expect(workbook.worksheets[0].getRow(2).getCell(1).value).toBe(
            '  =HYPERLINK("secret")',
          );
          expect(workbook.worksheets[0].getRow(2).getCell(2).value).toBe(
            "-9999999999999999.99",
          );
        }
      } finally {
        await writer.dispose();
      }
      await expect(access(path!)).rejects.toThrow();
    },
  );
  it("fails at the file-size limit and removes partial temporary output", async () => {
    const signal = AbortSignal.timeout(10000);
    const writer = await createReportExport(definition, "CSV", signal);
    try {
      await expect(
        writer.onBatch(
          Array.from({ length: 1000 }, () => ["x".repeat(30000), "0"]),
          signal,
        ),
      ).rejects.toThrow("25 MiB");
    } finally {
      await writer.dispose();
    }
  });
  it("aborts an output consumer and disposes its temporary file", async () => {
    const controller = new AbortController();
    const writer = await createReportExport(
      definition,
      "CSV",
      controller.signal,
    );
    controller.abort(new Error("Cancelled"));
    try {
      await expect(
        writer.onBatch([["reference", "1"]], controller.signal),
      ).rejects.toThrow("Cancelled");
    } finally {
      await writer.dispose();
    }
  });
});
