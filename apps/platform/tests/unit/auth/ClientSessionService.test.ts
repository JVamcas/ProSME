import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/lib/client-http", () => ({ requestJson: vi.fn() }));

import { requestJson } from "@/lib/client-http";
import { clientSessionService } from "@/platform/auth/ClientSessionService";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(100_000_000);
});
afterEach(() => vi.restoreAllMocks());

it("converts the server's remaining time to a stable local deadline despite clock skew", async () => {
  vi.mocked(requestJson).mockResolvedValue({
    serverNow: 10_000,
    expiresAt: 1_810_000,
  });
  const signal = new AbortController().signal;
  await expect(clientSessionService.read(signal)).resolves.toEqual({ expiresAt: 101_800_000 });
  expect(requestJson).toHaveBeenCalledWith("/api/auth/session/activity", {
    cache: "no-store",
    signal,
  });
});

it("marks renewal as an explicit POST and never retries it as a status check", async () => {
  vi.mocked(requestJson).mockResolvedValue({ serverNow: 10_000, expiresAt: 11_000 });
  await expect(clientSessionService.renew(99_985_000)).resolves.toEqual({ expiresAt: 100_001_000 });
  expect(requestJson).toHaveBeenCalledWith("/api/auth/session/activity", {
    cache: "no-store",
    headers: { "Content-Type": "application/json", "x-session-activity": "1" },
    body: JSON.stringify({ idleForMilliseconds: 15_000 }),
    method: "POST",
  });
});

it("does not give an already expired server deadline extra client time", async () => {
  vi.mocked(requestJson).mockResolvedValue({ serverNow: 10_000, expiresAt: 9000 });
  await expect(clientSessionService.read()).resolves.toEqual({ expiresAt: 100_000_000 });
});
