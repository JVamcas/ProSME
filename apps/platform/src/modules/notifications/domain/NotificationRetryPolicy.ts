import {
  notificationErrorCodes,
  type NotificationErrorCode,
} from "./NotificationErrors";

export const notificationMaximumAttempts = 5;

export function notificationRetryDelayMs(
  attemptNumber: number,
  jitter: number,
): number {
  const boundedAttempt = Math.max(1, Math.min(attemptNumber, notificationMaximumAttempts));
  const boundedJitter = Math.max(0, Math.min(jitter, 1));
  const baseDelay = 60_000 * (2 ** (boundedAttempt - 1));
  return Math.round(baseDelay * (0.75 + boundedJitter * 0.5));
}

export function deliveryFailureOutcome(input: {
  attemptNumber: number;
  code: NotificationErrorCode;
  now: Date;
  retryable: boolean;
  jitter: number;
}) {
  if (input.retryable && input.attemptNumber < notificationMaximumAttempts) {
    return {
      code: input.code,
      nextAttemptAt: new Date(
        input.now.getTime()
          + notificationRetryDelayMs(input.attemptNumber, input.jitter),
      ),
      retry: true as const,
    };
  }

  return {
    code: input.retryable
      ? notificationErrorCodes.retryExhausted
      : input.code,
    nextAttemptAt: input.now,
    retry: false as const,
  };
}
