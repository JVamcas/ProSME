import { describe, expect, it } from "vitest";

import {
  deliveryFailureOutcome,
  notificationMaximumAttempts,
  notificationRetryDelayMs,
} from "@/modules/notifications/domain/NotificationRetryPolicy";

describe("notification retry policy", () => {
  it("allows five automatic delivery attempts", () => {
    expect(notificationMaximumAttempts).toBe(5);
  });

  it("uses bounded exponential backoff with jitter", () => {
    expect(notificationRetryDelayMs(1, 0)).toBe(45_000);
    expect(notificationRetryDelayMs(2, 0.5)).toBe(120_000);
    expect(notificationRetryDelayMs(3, 1)).toBe(300_000);
  });

  it("retries transient failures and stops at five attempts", () => {
    const now = new Date("2026-09-27T10:00:00.000Z");
    expect(deliveryFailureOutcome({
      attemptNumber: 1,
      code: "NOTIFICATION_PROVIDER_TIMEOUT",
      jitter: 0.5,
      now,
      retryable: true,
    })).toMatchObject({ retry: true });
    expect(deliveryFailureOutcome({
      attemptNumber: 5,
      code: "NOTIFICATION_PROVIDER_TIMEOUT",
      jitter: 0.5,
      now,
      retryable: true,
    })).toEqual({
      code: "NOTIFICATION_RETRY_EXHAUSTED",
      nextAttemptAt: now,
      retry: false,
    });
  });

  it("does not retry terminal failures", () => {
    const now = new Date("2026-09-27T10:00:00.000Z");
    expect(deliveryFailureOutcome({
      attemptNumber: 1,
      code: "NOTIFICATION_PROVIDER_INVALID_ADDRESS",
      jitter: 0.5,
      now,
      retryable: false,
    })).toEqual({
      code: "NOTIFICATION_PROVIDER_INVALID_ADDRESS",
      nextAttemptAt: now,
      retry: false,
    });
  });
});
