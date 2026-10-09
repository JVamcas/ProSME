import "server-only";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { PassThrough, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import ExcelJS from "exceljs";
import type {
  ReportFormat,
  ReportTemplateDefinition,
} from "../domain/ReportDefinition";
import { RequestValidationError } from "@/lib/resource-errors";
import type { ReportRow } from "./ReportQueryRepository";

export const reportArtifactByteLimit = 25 * 1024 * 1024;
export const reportArtifactContentTypes = {
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  CSV: "text/csv; charset=utf-8",
};
function csvCell(value: ReportRow[number], type: string) {
  let text = value === null ? "" : String(value);
  // Keep legitimate numeric signs; neutralize formula text, including leading whitespace/control bytes.
  if (
    type !== "numeric" &&
    type !== "integer" &&
    /^[\s\u0000-\u001f]*[=+@-]/.test(text)
  ) {
    text = "'" + text;
  }
  return '"' + text.replaceAll('"', '""') + '"';
}
export async function createReportExport(
  definition: ReportTemplateDefinition,
  format: ReportFormat,
  signal: AbortSignal,
) {
  const directory = await mkdtemp(join(tmpdir(), "sme-report-"));
  const path = join(directory, `output.${format.toLowerCase()}`);
  const output = new PassThrough({ highWaterMark: 64 * 1024 });
  const hash = createHash("sha256");
  let bytes = 0;
  let rows = 0;
  const bounded = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > reportArtifactByteLimit) {
        callback(
          new RequestValidationError(
            "The generated file exceeds the 25 MiB limit.",
          ),
        );
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  const written = pipeline(
    output,
    bounded,
    createWriteStream(path, { mode: 0o600 }),
    { signal },
  );
  // Observe asynchronous writer/storage errors even while the SQL cursor is producing rows.
  let writeError: unknown;
  void written.catch((error) => {
    writeError = error;
  });
  const workbook =
    format === "XLSX"
      ? new ExcelJS.stream.xlsx.WorkbookWriter({
          stream: output,
          useSharedStrings: false,
          useStyles: false,
        })
      : null;
  const sheet = workbook?.addWorksheet("Report");
  if (sheet) {
    sheet.addRow(definition.columns.map((column) => column.name)).commit();
  } else {
    output.write(
      definition.columns
        .map((column) => csvCell(column.name, "text"))
        .join(",") + "\r\n",
    );
  }
  return {
    async onBatch(batch: ReportRow[], querySignal: AbortSignal) {
      for (const row of batch) {
        signal.throwIfAborted();
        querySignal.throwIfAborted();
        if (writeError) {
          throw writeError;
        }
        rows++;
        if (sheet) {
          // Exact PostgreSQL numeric/bigint strings remain text to avoid Excel's 15-digit rounding.
          // String cells are never interpreted as formulas by the XLSX writer.
          sheet.addRow(row).commit();
        } else {
          const line =
            row
              .map((value, index) =>
                csvCell(value, definition.columns[index].type),
              )
              .join(",") + "\r\n";
          if (!output.write(line)) {
            await once(output, "drain", { signal });
          }
        }
      }
    },
    async finish() {
      signal.throwIfAborted();
      if (workbook) {
        sheet!.commit();
        await workbook.commit();
      } else {
        output.end();
      }
      await written;
      return { bytes, rows, checksum: hash.digest("hex"), path };
    },
    read() {
      return createReadStream(path);
    },
    async dispose() {
      output.destroy();
      await written.catch(() => undefined);
      await rm(directory, { recursive: true, force: true });
    },
  };
}
