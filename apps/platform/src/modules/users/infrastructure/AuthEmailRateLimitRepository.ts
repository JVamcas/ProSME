import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

export async function consumeAuthEmailRateLimit(
  keyHash: string,
  limit: number,
) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`
      DELETE FROM app_auth_email_rate_limits
      WHERE window_started_at < now() - interval '1 day'
    `);
    const result = await transaction.execute<{ keyHash: string }>(sql`
      INSERT INTO app_auth_email_rate_limits (key_hash, window_started_at, request_count)
      VALUES (${keyHash}, now(), 1)
      ON CONFLICT (key_hash) DO UPDATE
      SET window_started_at = CASE
          WHEN app_auth_email_rate_limits.window_started_at <= now() - interval '1 minute'
          THEN now() ELSE app_auth_email_rate_limits.window_started_at END,
        request_count = CASE
          WHEN app_auth_email_rate_limits.window_started_at <= now() - interval '1 minute'
          THEN 1 ELSE app_auth_email_rate_limits.request_count + 1 END
      WHERE app_auth_email_rate_limits.window_started_at <= now() - interval '1 minute'
        OR app_auth_email_rate_limits.request_count < ${limit}
      RETURNING key_hash AS "keyHash"
    `);
    return result.rows.length === 1;
  });
}
