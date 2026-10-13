import type { AuthStrategy, Payload } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";

const mocks = vi.hoisted(() => ({
  resolveUser: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: mocks.resolveUser,
}));

import { firebaseSessionStrategy } from "@/payload/auth/firebase-session-strategy";
import { ensureCmsPrincipal } from "@/payload/system/ensure-cms-principal";

const user: AuthenticatedUser = {
  id: "application-user-id",
  status: "active",
  displayName: "Content Editor",
  email: "editor@example.test",
  capabilities: new Set([permissionCodes.cmsAccess, "cms.news.update"]),
  roleCodes: new Set(["cms_editor"]),
  identitySubject: "firebase-editor",
  userType: "staff",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  lastLoginAt: null,
};
const principal = {
  id: 17,
  applicationUserId: user.id,
  email: user.email,
  displayName: user.displayName,
  status: "active",
};
const payload = {
  find: mocks.find,
  create: mocks.create,
  update: mocks.update,
} as unknown as Payload;

function authenticate() {
  return firebaseSessionStrategy.authenticate({
    headers: new Headers({ cookie: "session=test" }),
    payload,
  } as Parameters<AuthStrategy["authenticate"]>[0]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.resolveUser.mockResolvedValue(user);
  mocks.find.mockResolvedValue({ docs: [principal] });
  mocks.create.mockResolvedValue(principal);
  mocks.update.mockResolvedValue(principal);
});

describe("Firebase CMS principal authentication", () => {
  it("uses an existing active mirror and the current PostgreSQL permissions", async () => {
    const result = await authenticate();
    expect(result.user).toMatchObject({
      ...principal,
      collection: "cms-principals",
      capabilities: [permissionCodes.cmsAccess, "cms.news.update"],
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("creates the missing mirror for an already authorized platform user", async () => {
    mocks.find.mockResolvedValue({ docs: [] });
    expect((await authenticate()).user).toMatchObject({ id: principal.id });
    expect(mocks.create).toHaveBeenCalledWith({
      collection: "cms-principals",
      overrideAccess: true,
      data: {
        applicationUserId: user.id,
        displayName: user.displayName,
        email: user.email,
        status: "active",
      },
    });
  });

  it.each([
    null,
    { ...user, capabilities: new Set() },
    { ...user, status: "disabled" },
    { ...user, status: "suspended" },
  ])("does not read or create CMS mirrors without active platform access: %j", async (actor) => {
    mocks.resolveUser.mockResolvedValue(actor);
    expect(await authenticate()).toEqual({ user: null });
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("also enforces CMS permission when the mirror helper is called directly", async () => {
    await expect(ensureCmsPrincipal(payload, {
      ...user,
      capabilities: new Set(),
    })).rejects.toThrow("cms.access");
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refreshes stale mirror status when PostgreSQL roles grant CMS access", async () => {
    mocks.find.mockResolvedValue({ docs: [{ ...principal, status: "disabled" }] });
    expect((await authenticate()).user).toMatchObject({ id: principal.id });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({
      collection: "cms-principals",
      id: principal.id,
      overrideAccess: true,
      data: {
        displayName: user.displayName,
        email: user.email,
        status: "active",
      },
    });
  });

  it("denies the next authenticated request after the role grant is removed", async () => {
    expect((await authenticate()).user).toMatchObject({ id: principal.id });
    mocks.find.mockClear();
    mocks.resolveUser.mockResolvedValue({ ...user, capabilities: new Set() });
    expect(await authenticate()).toEqual({ user: null });
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("takes updated editorial permissions from roles, never from the stored mirror", async () => {
    mocks.find.mockResolvedValue({
      docs: [{ ...principal, capabilities: ["cms.news.publish"] }],
    });
    expect((await authenticate()).user).toMatchObject({
      capabilities: [permissionCodes.cmsAccess, "cms.news.update"],
    });
  });

  it("recovers a mirror created by concurrent authentication for the same user", async () => {
    mocks.find
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [principal] });
    mocks.create.mockRejectedValue(new Error("Unique constraint"));
    expect((await authenticate()).user).toMatchObject({ id: principal.id });
    for (const [args] of mocks.find.mock.calls) {
      expect(args.where).toEqual({ applicationUserId: { equals: user.id } });
    }
  });

  it("refreshes a concurrent stale mirror according to the existing role grant", async () => {
    mocks.find
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [{ ...principal, status: "disabled" }] });
    mocks.create.mockRejectedValue(new Error("Unique constraint"));
    expect((await authenticate()).user).toMatchObject({ id: principal.id });
    expect(mocks.update).toHaveBeenCalled();
  });

  it("does not adopt another user's principal after an email conflict", async () => {
    mocks.find.mockResolvedValue({ docs: [] });
    mocks.create.mockRejectedValue(new Error("Email already belongs to another principal"));
    await expect(authenticate()).rejects.toThrow("Email already belongs");
    expect(mocks.find).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { applicationUserId: { equals: user.id } },
    }));
  });
});
