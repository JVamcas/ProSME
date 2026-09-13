import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/db/repositories/ProfileRepository", () => ({
  findApplicantProfile: vi.fn(),
  saveApplicantProfile: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import * as contextRoute from "@/app/api/portal/context/route";
import * as profileRoute from "@/app/api/portal/profile/route";
import {
  findApplicantProfile,
  saveApplicantProfile,
} from "@/db/repositories/ProfileRepository";

const applicantInput = {
  firstName: "Anna",
  surname: "Ndeitunga",
  position: "Managing director",
  phoneNumber: "+264810000000",
  dateOfBirth: "",
  nationality: "Namibian",
  region: "Khomas",
  postalAddress: "Private Bag 1",
};

const personalUpdate = {
  section: "personal" as const,
  data: {
    firstName: applicantInput.firstName,
    surname: applicantInput.surname,
    position: applicantInput.position,
    dateOfBirth: applicantInput.dateOfBirth,
    nationality: applicantInput.nationality,
    region: applicantInput.region,
  },
};

function user(
  granted: string[],
  status: AuthenticatedUser["status"] = "active",
): AuthenticatedUser {
  return {
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    email: "owner@example.test",
    displayName: "Anna Ndeitunga",
    userType: "applicant",
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    identitySubject: "private-firebase-subject",
    capabilities: new Set(granted),
    roleCodes: new Set(["applicant"]),
    profileComplete: false,
    businessProfileComplete: false,
  };
}

function request(path: string, body?: unknown) {
  return new Request(`http://localhost:3008${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined
      ? undefined
      : {
          "Content-Type": "application/json",
        },
    method: body === undefined ? "GET" : "PATCH",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findApplicantProfile).mockResolvedValue(null);
  vi.mocked(saveApplicantProfile).mockResolvedValue(undefined);
});

describe("protected portal context route", () => {
  it("returns a structured unauthenticated error", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);

    const response = await contextRoute.GET(request("/api/portal/context"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.meta.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each(["suspended", "disabled"] as const)(
    "rejects a %s applicant",
    async (status) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(
        user([capabilities.profileReadOwn], status),
      );

      const response = await contextRoute.GET(
        request("/api/portal/context"),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        error: {
          code: "FORBIDDEN",
        },
      });
    },
  );

  it("rejects active operations staff without applicant scope", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([capabilities.adminAccess]),
    );

    const response = await contextRoute.GET(request("/api/portal/context"));

    expect(response.status).toBe(403);
  });

  it("returns the accepted safe context projection", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([capabilities.profileReadOwn]),
    );

    const response = await contextRoute.GET(request("/api/portal/context"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      status: "active",
      roleCodes: ["applicant"],
      capabilityCodes: [capabilities.profileReadOwn],
      availableSpaces: ["applicant"],
      defaultSpace: "applicant",
    });
    expect(body.data).not.toHaveProperty("firebaseUid");
    expect(body.meta.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("protected applicant profile routes", () => {
  it("logs internal failures with the safe response correlation id", async () => {
    const error = new Error("database details");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(resolveUserFromHeaders).mockRejectedValueOnce(error);

    const response = await profileRoute.GET(request("/api/portal/profile"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.message).not.toContain("database details");
    expect(log).toHaveBeenCalledWith("Portal profile request failed", {
      correlationId: body.meta.correlationId,
      error,
    });
    log.mockRestore();
  });

  it("rejects profile reads without read-own permission", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(user([]));

    const response = await profileRoute.GET(request("/api/portal/profile"));

    expect(response.status).toBe(403);
    expect(findApplicantProfile).not.toHaveBeenCalled();
  });

  it("uses PATCH and returns structured validation fields", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([capabilities.profileUpdateOwn]),
    );

    const response = await profileRoute.PATCH(
      request("/api/portal/profile", {}),
    );
    const body = await response.json();

    expect("PUT" in profileRoute).toBe(false);
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields.section).toBeDefined();
  });

  it("updates the authenticated owner's profile", async () => {
    const actor = user([capabilities.profileUpdateOwn]);
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
    vi.mocked(findApplicantProfile).mockResolvedValue({
      ...applicantInput,
      email: actor.email,
      updatedAt: new Date(),
    });

    const response = await profileRoute.PATCH(
      request("/api/portal/profile", personalUpdate),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(saveApplicantProfile).toHaveBeenCalledWith(actor.id, personalUpdate);
    expect(body.data.email).toBe(actor.email);
    expect(body.meta.correlationId).toBeDefined();
  });
});
