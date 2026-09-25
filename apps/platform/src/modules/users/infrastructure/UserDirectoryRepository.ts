import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import type { FirebaseDirectoryAccount } from "./FirebaseUserDirectory";
import type { UserAccessListInput, UserAccessRow } from "../UserAccessTypes";

function orderFor(sort: UserAccessListInput["sort"]) {
  switch (sort) {
    case "name-desc":
      return sql`display_name DESC, email DESC, id DESC`;
    case "email-asc":
      return sql`email ASC, id ASC`;
    case "email-desc":
      return sql`email DESC, id DESC`;
    case "last-active-desc":
      return sql`last_login_at DESC NULLS LAST, id ASC`;
    case "status-asc":
      return sql`status ASC, display_name ASC, id ASC`;
    default:
      return sql`display_name ASC, email ASC, id ASC`;
  }
}

type DirectoryRow = {
  id: string | null;
  email: string | null;
  display_name: string | null;
  email_verified: boolean | null;
  last_login_at: string | Date | null;
  role_codes: string[] | null;
  capability_codes: string[] | null;
  status: UserAccessRow["status"] | null;
  user_type: UserAccessRow["userType"];
  total: number;
};

export async function listUserDirectory(
  input: UserAccessListInput,
  firebaseAccounts: FirebaseDirectoryAccount[],
) {
  const result = await getDatabase().execute(sql`
    WITH firebase_accounts AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(firebaseAccounts)}::jsonb)
        AS account(uid text, email text, "displayName" text,
          "emailVerified" boolean, disabled boolean, "lastLoginAt" text)
    ), app_directory AS (
      SELECT u.id::text AS id, u.email, u.display_name,
        coalesce(bool_or(i.email_verified), false) AS email_verified,
        u.last_login_at, u.status::text AS status, u.user_type::text AS user_type,
        coalesce(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}'::text[]) AS role_codes,
        coalesce(array_agg(DISTINCT c.code) FILTER (WHERE c.code IS NOT NULL), '{}'::text[]) AS capability_codes
      FROM app_users u
      LEFT JOIN app_user_identities i ON i.user_id = u.id AND i.provider = 'firebase'
      LEFT JOIN app_user_roles ur ON ur.user_id = u.id
      LEFT JOIN app_roles r ON r.id = ur.role_id
      LEFT JOIN app_role_capabilities rc ON rc.role_id = r.id
      LEFT JOIN app_capabilities c ON c.id = rc.capability_id
      GROUP BY u.id
    ), directory AS (
      SELECT * FROM app_directory
      UNION ALL
      SELECT 'firebase:' || f.uid, f.email, f."displayName",
        f."emailVerified", NULLIF(f."lastLoginAt", '')::timestamptz,
        'unprovisioned', NULL::text, '{}'::text[], '{}'::text[]
      FROM firebase_accounts f
      WHERE NOT EXISTS (
        SELECT 1 FROM app_user_identities i
        WHERE i.provider = 'firebase' AND i.subject = f.uid
      )
      AND NOT EXISTS (
        SELECT 1 FROM app_users u
        WHERE f.email <> '' AND lower(u.email) = lower(f.email)
      )
    ), filtered AS (
      SELECT * FROM directory d
      WHERE (${input.status ?? null}::text IS NULL OR d.status = ${input.status ?? null})
        AND (${input.role ?? null}::text IS NULL OR ${input.role ?? null} = ANY(d.role_codes))
        AND (${input.search ?? null}::text IS NULL OR (
          d.email ILIKE '%' || ${input.search ?? null} || '%'
          OR d.display_name ILIKE '%' || ${input.search ?? null} || '%'
          OR EXISTS (
            SELECT 1 FROM unnest(d.role_codes) code
            WHERE code ILIKE '%' || ${input.search ?? null} || '%'
          )
        ))
    ), total AS (SELECT count(*)::integer AS value FROM filtered),
    page AS (
      SELECT * FROM filtered
      ORDER BY ${orderFor(input.sort)}
      LIMIT ${input.limit} OFFSET ${(input.page - 1) * input.limit}
    )
    SELECT page.*, total.value AS total
    FROM total LEFT JOIN page ON true
    ORDER BY ${orderFor(input.sort)}
  `);
  const rows = result.rows as DirectoryRow[];
  return {
    items: rows.filter((row) => row.id !== null).map((row) => ({
      capabilityCodes: row.capability_codes ?? [],
      displayName: row.display_name ?? "",
      email: row.email ?? "",
      emailVerified: row.email_verified ?? false,
      id: row.id!,
      lastLoginAt: row.last_login_at instanceof Date
        ? row.last_login_at.toISOString()
        : row.last_login_at,
      roleCodes: row.role_codes ?? [],
      status: row.status!,
      userType: row.user_type,
    })),
    total: Number(rows[0]?.total ?? 0),
  };
}
