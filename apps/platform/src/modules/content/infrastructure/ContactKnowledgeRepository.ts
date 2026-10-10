import "server-only";
import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";

export type ContactKnowledgeProjection = {
  email: string | null;
  phone: string | null;
  address: string | null;
  officeHours: string | null;
};

export async function readContactKnowledgeSource(
  transaction: DatabaseTransaction,
) {
  const result = await transaction.execute(sql`
    SELECT email, phone, address, office_hours AS "officeHours"
    FROM cms_contact_details WHERE _status = 'published' AND review_status = 'approved'
    ORDER BY id LIMIT 1 FOR SHARE
  `);
  return (result.rows[0] as ContactKnowledgeProjection | undefined) ?? null;
}
