import "server-only";

import { getTableColumns, getTableName, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { DatabaseTransaction } from "@/platform/database/client";

export type DraftRow = {
  id: string;
  formVersionId: string;
  key: string;
  order: number;
} & Record<string, unknown>;

export function draftRowsSource(table: PgTable, rows: readonly DraftRow[]) {
  const columns = Object.entries(getTableColumns(table));
  const values = rows.map((row) =>
    Object.fromEntries(
      columns.map(([property, column]) => [column.name, row[property]]),
    ),
  );
  const definitions = columns.map(
    ([, column]) =>
      sql`${sql.identifier(column.name)} ${sql.raw(column.getSQLType())}`,
  );
  return sql`jsonb_to_recordset(${JSON.stringify(values)}::jsonb) AS incoming(${sql.join(definitions, sql`, `)})`;
}

// The caller has already claimed the draft row version inside the transaction.
// Release only changing unique keys/orders before a reorder, rename or move.
export async function releaseDraftPositions(
  transaction: DatabaseTransaction,
  table: PgTable,
  versionId: string,
  rows: readonly DraftRow[],
  sectionScoped = false,
) {
  const name = sql.identifier(getTableName(table));
  const identityChanged = sectionScoped
    ? sql`(target.key, target.display_order, target.section_id) IS DISTINCT FROM (incoming.key, incoming.display_order, incoming.section_id)`
    : sql`(target.key, target.display_order) IS DISTINCT FROM (incoming.key, incoming.display_order)`;
  await transaction.execute(sql`
    WITH desired AS (SELECT * FROM ${draftRowsSource(table, rows)}),
    changing AS (
      SELECT target.id, row_number() OVER (ORDER BY target.id) AS position
      FROM ${name} AS target
      LEFT JOIN desired AS incoming ON incoming.id = target.id
      WHERE target.form_version_id = ${versionId}
        AND (incoming.id IS NULL OR ${identityChanged})
    ), bounds AS (
      SELECT greatest(
        coalesce((SELECT max(display_order) FROM ${name} WHERE form_version_id = ${versionId}), 0),
        coalesce((SELECT max(display_order) FROM desired), 0)
      ) AS maximum
    )
    UPDATE ${name} AS target
    SET key = '__draft_sync_' || target.id::text,
        display_order = (bounds.maximum + changing.position)::integer
    FROM changing, bounds
    WHERE target.id = changing.id
  `);
}

export async function syncDraftRows(
  transaction: DatabaseTransaction,
  table: PgTable,
  rows: readonly DraftRow[],
) {
  if (!rows.length) return;
  const name = sql.identifier(getTableName(table));
  const columns = Object.values(getTableColumns(table));
  const mutable = columns.filter(
    (column) => !["id", "form_version_id"].includes(column.name),
  );
  const reference = (alias: string, column: { name: string }) =>
    sql`${sql.identifier(alias)}.${sql.identifier(column.name)}`;
  const tuple = (alias: string) =>
    sql`(${sql.join(
      mutable.map((column) => reference(alias, column)),
      sql`, `,
    )})`;
  const assignments = mutable.map(
    (column) =>
      sql`${sql.identifier(column.name)} = ${reference("incoming", column)}`,
  );
  // A foreign-version ID reaches the INSERT and fails its primary key, rather
  // than updating another version or silently discarding the requested row.
  await transaction.execute(sql`
    WITH desired AS (SELECT * FROM ${draftRowsSource(table, rows)}),
    updated AS (
      UPDATE ${name} AS target
      SET ${sql.join(assignments, sql`, `)}
      FROM desired AS incoming
      WHERE target.id = incoming.id
        AND target.form_version_id = incoming.form_version_id
        AND ${tuple("target")} IS DISTINCT FROM ${tuple("incoming")}
      RETURNING target.id
    )
    INSERT INTO ${name} (${sql.join(
      columns.map((column) => sql.identifier(column.name)),
      sql`, `,
    )})
    SELECT ${sql.join(
      columns.map((column) => reference("incoming", column)),
      sql`, `,
    )}
    FROM desired AS incoming
    WHERE NOT EXISTS (
      SELECT 1 FROM ${name} AS target
      WHERE target.id = incoming.id AND target.form_version_id = incoming.form_version_id
    )
  `);
}

export function draftIds(rows: readonly DraftRow[]): SQL {
  return sql`${JSON.stringify(rows.map((row) => row.id))}::jsonb`;
}
