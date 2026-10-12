import "server-only";

import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import { normalizePublicPageVisibility } from "../domain/PublicPageVisibility";

export async function readPublicPageVisibilityInTransaction(
  transaction: DatabaseTransaction,
) {
  const result = await transaction.execute<{ visibility: unknown }>(sql`
    SELECT visibility FROM cms_public_page_visibility ORDER BY id LIMIT 1 FOR SHARE
  `);
  return normalizePublicPageVisibility(result.rows[0]?.visibility);
}
