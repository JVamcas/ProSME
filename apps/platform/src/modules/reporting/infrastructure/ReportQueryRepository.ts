import "server-only";

import Cursor from "pg-cursor";
import { types, type FieldDef, type PoolClient } from "pg";
import { getReportingPool } from "@/platform/database/reporting-pool";
import type { ReportColumnType, ReportDataset } from "../domain/ReportDataset";
import { ReportQueryValidationError, reportQueryLimits } from "../domain/ReportQueryLimits";
import { prepareReportStatement, reportStatementText, validateReportSql } from "./ReportSqlPolicy";

export type ReportOutputColumn = { name: string; type: ReportColumnType };
export type ReportQueryScope = {
  actorId: string;
  datasetKey: ReportDataset["key"];
  runAt: string;
  timezone: string;
  propertyId?: string;
  collectionStart?: string;
  startDate?: string;
  endDate?: string;
  fundingCallId?: string;
};
export type ReportRow = (string | number | boolean | null)[];
export type ReportBatchConsumer = (rows: ReportRow[], signal: AbortSignal) => Promise<void>;

const outputOids: Record<ReportColumnType, readonly number[]> = {
  text: [25, 1043, 1042],
  uuid: [2950],
  date: [1082],
  timestamptz: [1184],
  numeric: [1700],
  integer: [20, 21, 23],
  boolean: [16],
};
const exactTextOids = new Set([20, 1700, 1082, 1184]);

function checkOutput(fields: FieldDef[], columns: ReportOutputColumn[]) {
  if (
    fields.length !== columns.length ||
    fields.some((field, index) => {
      const declared = columns[index];
      return field.name !== declared.name || !outputOids[declared.type].includes(field.dataTypeID);
    })
  ) {
    throw new ReportQueryValidationError(
      "The SQL result does not match its declared output columns and types.",
    );
  }
}

async function initializeExecution(client: PoolClient, scope: ReportQueryScope) {
  await client.query("BEGIN READ ONLY");
  await client.query("SET LOCAL ROLE app_reporting_reader");
  await client.query("SET LOCAL search_path = pg_catalog");
  await client.query(`SET LOCAL statement_timeout = '${reportQueryLimits.statementTimeoutMs}ms'`);
  await client.query(`SET LOCAL lock_timeout = '${reportQueryLimits.lockTimeoutMs}ms'`);
  await client.query(
    `SET LOCAL idle_in_transaction_session_timeout = '${reportQueryLimits.executionTimeoutMs}ms'`,
  );
  const settings = {
    "app.reporting_actor": scope.actorId,
    "app.reporting_dataset": scope.datasetKey,
    "app.reporting_run_at": scope.runAt,
    "app.reporting_timezone": scope.timezone,
    "app.reporting_property": scope.propertyId ?? "",
    "app.reporting_collection_start": scope.collectionStart ?? "",
    "app.reporting_start_date": scope.startDate ?? "",
    "app.reporting_end_date": scope.endDate ?? "",
    "app.reporting_funding_call": scope.fundingCallId ?? "",
  };
  await client.query(
    "SELECT set_config(setting.key, setting.value, true) FROM jsonb_each_text($1::jsonb) setting",
    [JSON.stringify(settings)],
  );
  const authorization = await client.query<{ allowed: boolean }>(
    "SELECT public.app_reporting_dataset_authorized($1) AS allowed",
    [scope.datasetKey],
  );
  if (!authorization.rows[0]?.allowed) {
    throw new ReportQueryValidationError(
      "The execution owner no longer has the required dataset and source access.",
    );
  }
}

function readBatch(cursor: Cursor<ReportRow>): Promise<{ rows: ReportRow[]; fields?: FieldDef[] }> {
  return new Promise((resolve, reject) => {
    cursor.read(reportQueryLimits.batchRows, (error, rows, result) => {
      if (error) {
        reject(error);
      } else {
        // pg-cursor omits result metadata when reading an already exhausted cursor.
        resolve({ rows, fields: result?.fields });
      }
    });
  });
}

let activeExecutions = 0;

export async function executeReportQuery(input: {
  dataset: ReportDataset;
  sql: string;
  values: unknown[];
  columns: ReportOutputColumn[];
  scope: ReportQueryScope;
  onBatch: ReportBatchConsumer;
}) {
  if (input.dataset.key !== input.scope.datasetKey) {
    throw new ReportQueryValidationError(
      "The execution context does not match the selected dataset.",
    );
  }
  const projection = await validateReportSql(input.sql, input.dataset, input.values.length);
  if (
    projection.length !== input.columns.length ||
    projection.some((name, index) => name !== input.columns[index].name)
  ) {
    throw new ReportQueryValidationError("Declared output names must match the SQL projection.");
  }
  if (activeExecutions >= reportQueryLimits.concurrency) {
    throw new ReportQueryValidationError("Reporting execution capacity is busy; retry this run.");
  }
  activeExecutions++;
  let client: PoolClient | undefined;
  let cursor: Cursor<ReportRow> | undefined;
  let rows = 0;
  let bytes = 0;
  let destroyConnection = false;
  const controller = new AbortController();
  const deadline = setTimeout(() => {
    destroyConnection = true;
    controller.abort(new ReportQueryValidationError("Reporting execution time limit exceeded."));
  }, reportQueryLimits.executionTimeoutMs);
  const abort = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(controller.signal.reason), {
      once: true,
    });
  });
  // Attach a handler while initializing the transaction; later races observe the same rejection.
  void abort.catch(() => undefined);
  try {
    client = await getReportingPool().connect();
    await Promise.race([initializeExecution(client, input.scope), abort]);
    const statement = await prepareReportStatement(input.sql, input.dataset);
    cursor = client.query(
      new Cursor<ReportRow>(statement, input.values, {
        rowMode: "array",
        types: {
          getTypeParser: (oid, format) =>
            exactTextOids.has(oid) ? (value: string) => value : types.getTypeParser(oid, format),
        },
      }),
    );
    let fields: FieldDef[] | undefined;
    while (true) {
      const batch = await Promise.race([readBatch(cursor), abort]);
      fields = batch.fields ?? fields;
      if (!fields) {
        throw new ReportQueryValidationError("The SQL result did not provide output metadata.");
      }
      checkOutput(fields, input.columns);
      if (!batch.rows.length) {
        break;
      }
      rows += batch.rows.length;
      bytes += Buffer.byteLength(JSON.stringify(batch.rows), "utf8");
      if (rows > reportQueryLimits.rows || bytes > reportQueryLimits.bytes) {
        throw new ReportQueryValidationError(
          "Report row or output byte limit exceeded; no complete output was generated.",
        );
      }
      await Promise.race([input.onBatch(batch.rows, controller.signal), abort]);
    }
    await cursor.close();
    cursor = undefined;
    await client.query("COMMIT");
    return { rows, bytes };
  } catch (error) {
    controller.abort(error);
    throw error;
  } finally {
    clearTimeout(deadline);
    try {
      if (cursor && !destroyConnection) {
        await cursor.close();
      }
      if (client && !destroyConnection) {
        await client.query("ROLLBACK");
      }
    } catch {
      destroyConnection = true;
    }
    client?.release(destroyConnection);
    activeExecutions--;
  }
}

export async function validateReportOutputContract(
  input: Parameters<typeof executeReportQuery>[0],
) {
  const names = await validateReportSql(input.sql, input.dataset, input.values.length);
  if (
    names.length !== input.columns.length ||
    names.some((name, index) => name !== input.columns[index].name)
  ) {
    throw new ReportQueryValidationError("Declared output names must match the SQL projection.");
  }
  const statement = await reportStatementText(input.sql);
  const projection = input.columns.map((column) => `report_output."${column.name}"`).join(", ");
  return executeReportQuery({
    ...input,
    sql: `SELECT ${projection} FROM (${statement}) report_output WHERE false`,
    onBatch: async () => undefined,
  });
}
