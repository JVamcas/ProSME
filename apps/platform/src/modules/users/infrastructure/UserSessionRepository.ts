import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/platform/database/client";

type SessionExpiry = { expiresAt: Date };

export async function registerUserSession(input: {
  sessionHash: string;
  userId: string;
  firebaseSubject: string;
  idleMilliseconds: number;
  absoluteExpiresAt: Date;
}) {
  return getDatabase().transaction(async (transaction) => {
    await transaction.execute(sql`
      DELETE FROM app_user_sessions WHERE expires_at <= clock_timestamp()
    `);
    const result = await transaction.execute<SessionExpiry>(sql`
      INSERT INTO app_user_sessions (
        session_hash, user_id, firebase_subject, expires_at, absolute_expires_at
      )
      VALUES (
        ${input.sessionHash}, ${input.userId}::uuid, ${input.firebaseSubject},
        LEAST(clock_timestamp() + ${input.idleMilliseconds} * interval '1 millisecond',
          ${input.absoluteExpiresAt}::timestamptz),
        ${input.absoluteExpiresAt}::timestamptz
      )
      ON CONFLICT (session_hash) DO UPDATE
      SET expires_at = EXCLUDED.expires_at,
        absolute_expires_at = EXCLUDED.absolute_expires_at
      RETURNING expires_at AS "expiresAt"
    `);
    const session = result.rows[0];
    if (!session) {
      throw new Error("Unable to register the application session");
    }
    return session;
  });
}

export async function findActiveUserSession(
  sessionHash: string,
  firebaseSubject: string,
): Promise<SessionExpiry | null> {
  const result = await getDatabase().execute<SessionExpiry>(sql`
    SELECT s.expires_at AS "expiresAt"
    FROM app_user_sessions s
    JOIN app_users u ON u.id = s.user_id AND u.status = 'active'
    WHERE s.session_hash = ${sessionHash}
      AND s.firebase_subject = ${firebaseSubject}
      AND s.expires_at > clock_timestamp()
      AND s.absolute_expires_at > clock_timestamp()
    LIMIT 1
  `);
  return result.rows[0] ?? null;
}

export async function renewUserSession(
  sessionHash: string,
  firebaseSubject: string,
  idleMilliseconds: number,
): Promise<SessionExpiry | null> {
  // A single conditional write prevents renewal from reviving an expired or
  // deleted session, including a concurrent logout from another tab.
  const result = await getDatabase().execute<SessionExpiry>(sql`
    UPDATE app_user_sessions s
    SET expires_at = GREATEST(
      s.expires_at,
      LEAST(
        clock_timestamp() + ${idleMilliseconds} * interval '1 millisecond',
        s.absolute_expires_at
      )
    )
    FROM app_users u
    WHERE u.id = s.user_id AND u.status = 'active'
      AND s.session_hash = ${sessionHash}
      AND s.firebase_subject = ${firebaseSubject}
      AND s.expires_at > clock_timestamp()
      AND s.absolute_expires_at > clock_timestamp()
    RETURNING s.expires_at AS "expiresAt"
  `);
  return result.rows[0] ?? null;
}

export async function deleteUserSession(sessionHash: string) {
  await getDatabase().execute(sql`
    DELETE FROM app_user_sessions WHERE session_hash = ${sessionHash}
  `);
}
