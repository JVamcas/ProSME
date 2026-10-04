import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/platform/auth/firebase/ServerFirebaseSession", () => ({
  verifyFirebaseSessionFromHeaders: vi.fn(),
}));
vi.mock("@/db/repositories/UserRepository", () => ({
  findUserByFirebaseSubject: vi.fn(),
}));

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { verifyFirebaseSessionFromHeaders } from "@/platform/auth/firebase/ServerFirebaseSession";
import { findUserByFirebaseSubject } from "@/db/repositories/UserRepository";

beforeEach(() => vi.clearAllMocks());

it("retains PostgreSQL actor and permission resolution after standard verification", async () => {
  const identity = { uid: "firebase-subject" };
  const actor = {
    id: "actor",
    capabilities: new Set(["scoped-permission"]),
    status: "active",
  };
  vi.mocked(verifyFirebaseSessionFromHeaders).mockResolvedValue(
    identity as never,
  );
  vi.mocked(findUserByFirebaseSubject).mockResolvedValue(actor as never);
  const headers = new Headers();
  expect(await resolveUserFromHeaders(headers)).toBe(actor);
  expect(verifyFirebaseSessionFromHeaders).toHaveBeenCalledWith(
    headers,
    undefined,
  );
  expect(findUserByFirebaseSubject).toHaveBeenCalledExactlyOnceWith(
    identity.uid,
  );
});

it("propagates sensitive verification and denies failed authentication before actor reads", async () => {
  vi.mocked(verifyFirebaseSessionFromHeaders).mockResolvedValue(null);
  const headers = new Headers();
  expect(
    await resolveUserFromHeaders(headers, { checkRevoked: true }),
  ).toBeNull();
  expect(verifyFirebaseSessionFromHeaders).toHaveBeenCalledWith(headers, {
    checkRevoked: true,
  });
  expect(findUserByFirebaseSubject).not.toHaveBeenCalled();
});
