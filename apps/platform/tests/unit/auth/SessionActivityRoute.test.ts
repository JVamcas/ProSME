import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/platform/auth/ServerSessionService", () => ({
  readSessionActivity: vi.fn(),
  renewSessionActivity: vi.fn(),
}));

import { GET, POST } from "@/app/api/auth/session/activity/route";
import { readSessionActivity, renewSessionActivity } from "@/platform/auth/ServerSessionService";
import { sessionIdleMilliseconds } from "@/platform/auth/SessionPolicy";
import { getSessionCookieName } from "@/auth/firebase/cookies";

const url = "https://fund.example.test/api/auth/session/activity";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readSessionActivity).mockResolvedValue({ expiresAt: Date.now() + 1000, sessionCookie: "cookie" });
  vi.mocked(renewSessionActivity).mockResolvedValue({ expiresAt: Date.now() + sessionIdleMilliseconds, sessionCookie: "cookie" });
});

describe("session activity transport", () => {
  it.each([
    {
      internalUrl: "http://0.0.0.0:3008/api/auth/session/activity",
      origin: "http://localhost:3008",
      host: "localhost:3008",
      protocol: "http",
    },
    {
      internalUrl: "https://0.0.0.0:3008/api/auth/session/activity",
      origin: "https://smefund.na",
      host: "smefund.na",
      protocol: "https",
    },
    {
      internalUrl: "http://127.0.0.1:3008/api/auth/session/activity",
      origin: "https://smefund.na",
      host: "smefund.na",
      protocol: "https",
    },
  ])("renews through a container or TLS proxy for $origin", async (deployment) => {
    const response = await POST(new Request(deployment.internalUrl, {
      method: "POST",
      headers: {
        host: deployment.host,
        origin: deployment.origin,
        "x-forwarded-proto": deployment.protocol,
        "x-session-activity": "1",
        "sec-fetch-site": "same-origin",
      },
      body: JSON.stringify({ idleForMilliseconds: 0 }),
    }));

    expect(response.status).toBe(200);
    expect(renewSessionActivity).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("Max-Age=");
  });

  it.each([
    { origin: "https://attacker.test" },
    { origin: "https://0.0.0.0:3008" },
    { origin: "http://smefund.na" },
    { origin: "null" },
    { origin: "https://smefund.na", "sec-fetch-site": "cross-site" },
    { origin: "https://smefund.na", "x-forwarded-proto": "https, http" },
    { origin: "https://smefund.na", host: "smefund.na/other" },
    { origin: "https://smefund.na", host: "attacker.test" },
  ])("rejects mismatched proxy origin metadata: %j", async (headers) => {
    const response = await POST(new Request(
      "https://0.0.0.0:3008/api/auth/session/activity",
      {
        method: "POST",
        headers: {
          host: "smefund.na",
          "x-forwarded-proto": "https",
          "x-session-activity": "1",
          "sec-fetch-site": "same-origin",
          ...headers,
        },
        body: JSON.stringify({ idleForMilliseconds: 0 }),
      },
    ));

    expect(response.status).toBe(403);
    expect(renewSessionActivity).not.toHaveBeenCalled();
  });

  it("reads an uncached deadline without setting cookies or renewing", async () => {
    const response = await GET(new Request(url));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(renewSessionActivity).not.toHaveBeenCalled();
  });

  it.each<Record<string, string>>([
    {},
    { origin: "https://attacker.test", "x-session-activity": "1" },
    { origin: "https://fund.example.test" },
    { origin: "https://fund.example.test", "x-session-activity": "1", "sec-fetch-site": "cross-site" },
  ])("rejects requests without same-origin activity protection: %j", async (headers) => {
    const response = await POST(new Request(url, { method: "POST", headers }));
    expect(response.status).toBe(403);
    expect(renewSessionActivity).not.toHaveBeenCalled();
  });

  it("renews the HttpOnly cookie for the remaining idle window", async () => {
    const response = await POST(new Request(url, {
      method: "POST",
      headers: { origin: "https://fund.example.test", "x-session-activity": "1", "sec-fetch-site": "same-origin" },
      body: JSON.stringify({ idleForMilliseconds: 1000 }),
    }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain(`${getSessionCookieName()}=cookie`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    const age = Number(cookie?.match(/Max-Age=(\d+)/)?.[1]);
    expect(age).toBeGreaterThanOrEqual(299);
    expect(age).toBeLessThanOrEqual(300);
  });

  it("rejects expired sessions without issuing another cookie", async () => {
    vi.mocked(renewSessionActivity).mockResolvedValue(null);
    const response = await POST(new Request(url, {
      method: "POST",
      headers: { origin: "https://fund.example.test", "x-session-activity": "1" },
      body: JSON.stringify({ idleForMilliseconds: 0 }),
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([-1, 300_001, 1.5, "0", null])("rejects invalid activity timing: %j", async (idleForMilliseconds) => {
    const response = await POST(new Request(url, {
      method: "POST",
      headers: { origin: "https://fund.example.test", "x-session-activity": "1" },
      body: JSON.stringify({ idleForMilliseconds }),
    }));
    expect(response.status).toBe(400);
    expect(renewSessionActivity).not.toHaveBeenCalled();
  });
});
