import { randomUUID } from "node:crypto";
import { NodePgSession, NodePgTransaction } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/platform/database/client";
import {
  deleteUserSession,
  findActiveUserSession,
  registerUserSession,
  renewUserSession,
} from "@/modules/users/infrastructure/UserSessionRepository";

const enabled = process.env.RUN_USER_SESSION_DATABASE_TESTS === "true";
const client = enabled
  ? new pg.Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5_000,
    })
  : null;
const userId = randomUUID();
const idleMilliseconds = 1_800_000;

beforeAll(async () => {
  if (!client) return;
  await client.connect();
  const dialect = new PgDialect();
  const session = new NodePgSession(client, dialect, undefined);
  // Repository transactions use savepoints inside the fixture's rollback scope.
  vi.mocked(getDatabase).mockReturnValue(
    new NodePgTransaction(dialect, session, undefined) as ReturnType<
      typeof getDatabase
    >,
  );
});

beforeEach(async () => {
  if (!client) return;
  await client.query("BEGIN");
  // Temporary tables shadow application tables; all fixture writes roll back.
  await client.query(`
    CREATE TEMP TABLE app_users (
      id uuid PRIMARY KEY, status text NOT NULL
    ) ON COMMIT DROP;
    CREATE TEMP TABLE app_user_sessions (
      session_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES app_users(id),
      firebase_subject text NOT NULL,
      expires_at timestamptz NOT NULL,
      absolute_expires_at timestamptz NOT NULL,
      CHECK (expires_at <= absolute_expires_at)
    ) ON COMMIT DROP;
  `);
  await client.query("INSERT INTO app_users VALUES ($1, 'active')", [userId]);
});

afterEach(async () => {
  if (client) await client.query("ROLLBACK");
});

afterAll(async () => {
  if (client) await client.end();
});

function register(absoluteExpiresAt = new Date(Date.now() + 3_600_000)) {
  return registerUserSession({
    sessionHash: "session-hash",
    userId,
    firebaseSubject: "owner",
    idleMilliseconds,
    absoluteExpiresAt,
  });
}

(enabled ? describe : describe.skip)("PostgreSQL session expiry decoding", () => {
  it("returns usable dates for registration, reads and renewal", async () => {
    const startedAt = Date.now();
    const registered = await register();
    expect(registered.expiresAt).toBeInstanceOf(Date);
    expect(registered.expiresAt.getTime()).toBeGreaterThan(startedAt);
    expect(registered.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + idleMilliseconds,
    );

    const read = await findActiveUserSession("session-hash", "owner");
    expect(read?.expiresAt.getTime()).toBe(registered.expiresAt.getTime());

    const renewed = await renewUserSession(
      "session-hash",
      "owner",
      idleMilliseconds,
    );
    expect(renewed?.expiresAt).toBeInstanceOf(Date);
    expect(renewed?.expiresAt.getTime()).toBeGreaterThanOrEqual(
      registered.expiresAt.getTime(),
    );
  });

  it("preserves the absolute expiry cap when decoding timestamps", async () => {
    const absoluteExpiresAt = new Date(Date.now() + 60_000);
    const registered = await register(absoluteExpiresAt);
    const renewed = await renewUserSession(
      "session-hash",
      "owner",
      idleMilliseconds,
    );
    expect(registered.expiresAt.getTime()).toBe(absoluteExpiresAt.getTime());
    expect(renewed?.expiresAt.getTime()).toBe(absoluteExpiresAt.getTime());
  });

  it("returns no expiry for a different identity or a logged-out session", async () => {
    await register();
    await expect(
      findActiveUserSession("session-hash", "other-user"),
    ).resolves.toBeNull();
    await expect(
      renewUserSession("session-hash", "other-user", idleMilliseconds),
    ).resolves.toBeNull();
    await deleteUserSession("session-hash");
    await expect(
      findActiveUserSession("session-hash", "owner"),
    ).resolves.toBeNull();
    await expect(
      renewUserSession("session-hash", "owner", idleMilliseconds),
    ).resolves.toBeNull();
  });
});
