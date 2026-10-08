import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/platform/auth/ServerSessionActivityService", () => ({
  endApplicationSession: vi.fn(),
}));

import { POST } from "@/app/api/auth/logout/route";
import { endApplicationSession } from "@/platform/auth/ServerSessionActivityService";
import { csrfCookieName, getSessionCookieName } from "@/auth/firebase/cookies";

beforeEach(() => vi.clearAllMocks());

it("deletes the server session and cookie after CSRF validation", async () => {
  const request = new Request("https://fund.example.test/api/auth/logout", {
    method: "POST",
    headers: { cookie: `${csrfCookieName}=token; ${getSessionCookieName()}=session` },
    body: JSON.stringify({ csrfToken: "token" }),
  });
  const response = await POST(request);
  expect(response.status).toBe(200);
  expect(endApplicationSession).toHaveBeenCalledExactlyOnceWith(request.headers);
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});

it("rejects forged logout without deleting the server session", async () => {
  const response = await POST(new Request("https://fund.example.test/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ csrfToken: "wrong" }),
  }));
  expect(response.status).toBe(403);
  expect(endApplicationSession).not.toHaveBeenCalled();
});
