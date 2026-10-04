import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  user: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(destination);
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { proxy } from "@/proxy";
import { authRequestPathHeader } from "@/platform/auth/AuthNavigation";
import { getAuthenticatedPageUser, redirectToSignIn } from "@/platform/auth/ServerAuthNavigation";

beforeEach(() => vi.clearAllMocks());

describe("blocked page authentication navigation", () => {
  it.each([
    "/portal/applications/new?fundingOpportunityId=call-id",
    "/admin/tasks/123?tab=history&view=full",
    "/cms/collections/pages/42?locale=en",
  ])("uses the full actual request URL for %s", async (path) => {
    const request = new NextRequest(`https://platform.invalid${path}`, {
      headers: { [authRequestPathHeader]: "/spoofed" },
    });
    const response = proxy(request);
    const forwardedPath = response.headers.get(
      `x-middleware-request-${authRequestPathHeader}`,
    );
    expect(forwardedPath).toBe(path);
    mocks.headers.mockResolvedValue(new Headers({
      [authRequestPathHeader]: forwardedPath!,
    }));

    await expect(redirectToSignIn()).rejects.toThrow("/sign-in?returnTo=");
    const destination = mocks.redirect.mock.calls[0][0];
    expect(new URL(destination, "https://platform.invalid").searchParams.get("returnTo"))
      .toBe(path);
  });

  it("allows signed-in users without changing their authorization", async () => {
    const user = { id: "signed-in-user" };
    mocks.user.mockResolvedValue(user);
    expect(await getAuthenticatedPageUser()).toBe(user);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects an anonymous protected-page read before page logic runs", async () => {
    mocks.user.mockResolvedValue(null);
    mocks.headers.mockResolvedValue(new Headers({
      [authRequestPathHeader]: "/admin/tasks/42?tab=history",
    }));
    await expect(getAuthenticatedPageUser()).rejects.toThrow("/sign-in?returnTo=");
  });

  it("falls back to sign-in without a hard-coded target", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    await expect(redirectToSignIn()).rejects.toThrow("/sign-in");
    expect(mocks.redirect).toHaveBeenCalledWith("/sign-in");
  });
});
