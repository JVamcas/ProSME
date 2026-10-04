import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { measureAuthenticationVerification } from "@/platform/monitoring/ServerAuthenticationTiming";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("leaves instrumentation disabled by default", async () => {
  vi.stubEnv("AUTHENTICATION_TIMING", undefined);
  const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
  expect(
    await measureAuthenticationVerification(
      "session-cookie",
      false,
      async () => "identity",
    ),
  ).toBe("identity");
  expect(log).not.toHaveBeenCalled();
});

it("records duration and mode without credentials or identity data", async () => {
  vi.stubEnv("AUTHENTICATION_TIMING", "1");
  const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
  await measureAuthenticationVerification(
    "session-cookie",
    false,
    async () => ({ uid: "private-identity" }),
  );
  expect(log).toHaveBeenCalledExactlyOnceWith(
    "Firebase authentication timing",
    {
      operation: "session-cookie",
      checkRevoked: false,
      succeeded: true,
      durationMs: expect.any(Number),
    },
  );
  expect(JSON.stringify(log.mock.calls)).not.toContain("private-identity");
});

it("preserves failures and logs no token or SDK error details", async () => {
  vi.stubEnv("AUTHENTICATION_TIMING", "1");
  const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const error = new Error("sensitive-token-details");
  await expect(
    measureAuthenticationVerification("id-token", true, async () => {
      throw error;
    }),
  ).rejects.toBe(error);
  expect(log.mock.calls[0][1]).toMatchObject({
    succeeded: false,
    checkRevoked: true,
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain(error.message);
});
