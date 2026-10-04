import { sql, type SQL } from "drizzle-orm";

export function workflowTaskViewPermissionMatches(
  permissions: SQL,
  grantedCodes?: readonly string[],
): SQL {
  // Commands retain their existing configured edit/decide checks; read services
  // supply the viewer's grants to filter protected projections in SQL.
  if (grantedCodes === undefined) return sql`true`;
  if (!grantedCodes.length) return sql`false`;
  return sql`${permissions} ->> 'view' IN (
    ${sql.join(grantedCodes.map((code) => sql`${code}`), sql`, `)}
  )`;
}
