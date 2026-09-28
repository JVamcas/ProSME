import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isAuthorizedNotificationProcessorRequest,
  parseNotificationProcessorConfiguration,
} from "@/modules/notifications/application/NotificationProcessorConfiguration";

const secret = "processor-test-secret-with-32-characters";

describe("notification processor service authentication", () => {
  it("parses bounded defaults and authorizes only the exact bearer secret", () => {
    expect(parseNotificationProcessorConfiguration({
      NOTIFICATION_PROCESSOR_SECRET: secret,
    })).toMatchObject({
      NOTIFICATION_PROCESSOR_BATCH_SIZE: 25,
      NOTIFICATION_PROCESSOR_EXECUTION_TIMEOUT_MS: 45_000,
      NOTIFICATION_PROCESSOR_LOCK_TIMEOUT_MS: 300_000,
    });
    expect(isAuthorizedNotificationProcessorRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedNotificationProcessorRequest(null, secret)).toBe(false);
    expect(isAuthorizedNotificationProcessorRequest("Bearer firebase-user-token", secret)).toBe(false);
  });

  it("rejects unsafe limits and never prints the secret", () => {
    expect(() => parseNotificationProcessorConfiguration({
      NOTIFICATION_PROCESSOR_BATCH_SIZE: "1000",
      NOTIFICATION_PROCESSOR_SECRET: secret,
    })).toThrow("NOTIFICATION_PROCESSOR_BATCH_SIZE");
    expect(() => parseNotificationProcessorConfiguration({
      NOTIFICATION_PROCESSOR_SECRET: "short-secret",
    })).toThrowError(expect.not.stringContaining("short-secret"));
  });
});
