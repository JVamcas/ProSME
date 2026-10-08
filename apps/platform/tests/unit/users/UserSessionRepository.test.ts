import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ execute: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: () => database }));

import {
  deleteUserSession,
  findActiveUserSession,
  registerUserSession,
  renewUserSession,
} from "@/modules/users/infrastructure/UserSessionRepository";
import { hashSessionCookie } from "@/platform/auth/ServerSessionActivityService";

const dialect = new PgDialect();
beforeEach(() => {
  vi.clearAllMocks();
  database.execute.mockResolvedValue({ rows: [] });
  database.transaction.mockImplementation((callback) => callback(database));
});

describe("user session persistence", () => {
  it("stores only a hash and bounded deadlines and cleans expired records atomically", async () => {
    database.execute.mockResolvedValueOnce({ rows: [] });
    const expiresAt = "2026-10-08 10:30:00.123+00";
    database.execute.mockResolvedValueOnce({ rows: [{ expiresAt }] });
    const sessionHash = hashSessionCookie("secret-cookie");
    expect(sessionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionHash).not.toContain("secret-cookie");
    const session = await registerUserSession({
      sessionHash,
      userId: "00000000-0000-4000-8000-000000000001",
      firebaseSubject: "owner",
      idleMilliseconds: 1_800_000,
      absoluteExpiresAt: new Date("2026-10-13T10:00:00Z"),
    });
    expect(database.transaction).toHaveBeenCalledOnce();
    const cleanup = dialect.sqlToQuery(database.execute.mock.calls[0][0]);
    expect(cleanup.sql).toContain("expires_at <= clock_timestamp()");
    const insert = dialect.sqlToQuery(database.execute.mock.calls[1][0]);
    expect(insert.sql).toContain("LEAST(");
    expect(insert.params).toContain(sessionHash);
    expect(insert.params).not.toContain("secret-cookie");
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.expiresAt.getTime()).toBe(Date.parse(expiresAt));
  });

  it.each([
    ["read", findActiveUserSession],
    [
      "renew",
      (hash: string, subject: string) =>
        renewUserSession(hash, subject, 1_800_000),
    ],
  ])("decodes the raw PostgreSQL deadline for %s", async (_, operation) => {
    const expiresAt = "2026-10-08 12:30:00.123+02";
    database.execute.mockResolvedValue({ rows: [{ expiresAt }] });

    const session = await operation("hash", "owner");

    expect(session?.expiresAt).toBeInstanceOf(Date);
    expect(session?.expiresAt.getTime()).toBe(Date.parse(expiresAt));
  });

  it("projects the deadline for an exact own active session in SQL", async () => {
    await expect(findActiveUserSession("hash", "owner")).resolves.toBeNull();
    const query = dialect.sqlToQuery(database.execute.mock.calls[0][0]);
    expect(query.sql).toContain('SELECT s.expires_at AS "expiresAt"');
    expect(query.sql).toContain("u.status = 'active'");
    expect(query.sql).toContain("s.firebase_subject =");
    expect(query.sql).toContain("s.expires_at > clock_timestamp()");
    expect(query.sql).toContain("s.absolute_expires_at > clock_timestamp()");
    expect(query.sql).toContain("LIMIT 1");
    expect(query.params).toEqual(["hash", "owner"]);
  });

  it("uses a conditional update so expired, logged-out, or inactive sessions cannot revive", async () => {
    await expect(renewUserSession("hash", "owner", 1_800_000)).resolves.toBeNull();
    const query = dialect.sqlToQuery(database.execute.mock.calls[0][0]);
    expect(query.sql).toContain("UPDATE app_user_sessions");
    expect(query.sql).toContain("s.absolute_expires_at");
    expect(query.sql).toContain("s.expires_at > clock_timestamp()");
    expect(query.sql).toContain("s.firebase_subject =");
    expect(query.sql).toContain("u.status = 'active'");
    expect(query.sql).not.toContain("INSERT");
    expect(query.params).toEqual([1_800_000, "hash", "owner"]);
  });

  it("deletes only the caller's cookie hash on logout", async () => {
    await deleteUserSession("current-hash");
    const query = dialect.sqlToQuery(database.execute.mock.calls[0][0]);
    expect(query.sql).toContain("WHERE session_hash =");
    expect(query.params).toEqual(["current-hash"]);
  });
});
