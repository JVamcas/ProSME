import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

const heartbeatPath = "/tmp/notification-scheduler-heartbeat";

function log(level, event, context = {}) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "notification-scheduler",
    event,
    ...context,
  });
  const destination = level === "error"
    ? console.error
    : level === "warn"
      ? console.warn
      : console.info;
  destination(record);
}

function positiveInteger(name, fallback, minimum) {
  const raw = process.env[name] ?? fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || String(value) !== raw || value < minimum) {
    throw new Error(`${name} must be an integer of at least ${minimum}.`);
  }
  return value;
}

function processorEndpoint() {
  const value = process.env.NOTIFICATION_PROCESSOR_URL
    ?? "http://app:3008/api/internal/notifications/process";
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error("NOTIFICATION_PROCESSOR_URL must be a safe HTTP(S) URL.");
  }
  return url;
}

function isBatchResult(value) {
  if (!value || typeof value !== "object") return false;
  return ["claimed", "failed", "processed", "retrying", "sent"].every(
    (field) => Number.isSafeInteger(value[field]) && value[field] >= 0,
  );
}

function safeError(error) {
  if (!(error instanceof Error)) {
    return { errorType: "UnknownError", message: "Unknown scheduler failure." };
  }
  if (error.name === "TimeoutError") {
    return { errorType: "TimeoutError", message: "Processor request timed out." };
  }
  return { errorType: error.name, message: error.message };
}

let configuration;
try {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "NOTIFICATION_PROCESSOR_SECRET must contain at least 32 characters.",
    );
  }
  configuration = {
    endpoint: processorEndpoint(),
    intervalMs: positiveInteger(
      "NOTIFICATION_PROCESSOR_INTERVAL_MS",
      "60000",
      1_000,
    ),
    maxConsecutiveFailures: positiveInteger(
      "NOTIFICATION_SCHEDULER_MAX_CONSECUTIVE_FAILURES",
      "5",
      1,
    ),
    requestTimeoutMs: positiveInteger(
      "NOTIFICATION_SCHEDULER_REQUEST_TIMEOUT_MS",
      "60000",
      1_000,
    ),
    secret,
  };
} catch (error) {
  log("error", "notification.scheduler.configuration_invalid", safeError(error));
  process.exit(1);
}

let activeRequest;
let consecutiveFailures = 0;
let stopping = false;
let wakeWait;

function requestShutdown(signal) {
  if (stopping) return;
  stopping = true;
  log("info", "notification.scheduler.shutdown_requested", { signal });
  activeRequest?.abort();
  wakeWait?.();
}

process.once("SIGINT", () => requestShutdown("SIGINT"));
process.once("SIGTERM", () => requestShutdown("SIGTERM"));

function waitForNextRun() {
  return new Promise((resolve) => {
    const timeout = setTimeout(finish, configuration.intervalMs);
    function finish() {
      clearTimeout(timeout);
      wakeWait = undefined;
      resolve();
    }
    wakeWait = finish;
  });
}

async function writeHeartbeat() {
  await writeFile(heartbeatPath, new Date().toISOString(), { mode: 0o600 });
}

async function processNotificationBatch() {
  const runId = randomUUID();
  const startedAt = Date.now();
  activeRequest = new AbortController();
  const timeoutSignal = AbortSignal.timeout(configuration.requestTimeoutMs);
  const signal = AbortSignal.any([activeRequest.signal, timeoutSignal]);
  log("info", "notification.scheduler.batch_started", { runId });

  try {
    const response = await fetch(configuration.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.secret}`,
        "X-Request-Id": runId,
      },
      signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Notification processor returned HTTP ${response.status}.`);
    }
    if (!isBatchResult(body?.data)) {
      throw new Error("Notification processor returned an invalid response.");
    }
    consecutiveFailures = 0;
    log("info", "notification.scheduler.batch_completed", {
      durationMs: Date.now() - startedAt,
      runId,
      ...body.data,
    });
  } catch (error) {
    if (stopping && activeRequest.signal.aborted) {
      log("info", "notification.scheduler.batch_interrupted", {
        durationMs: Date.now() - startedAt,
        runId,
      });
      return;
    }
    consecutiveFailures += 1;
    log("error", "notification.scheduler.batch_failed", {
      consecutiveFailures,
      durationMs: Date.now() - startedAt,
      runId,
      ...safeError(error),
    });
  } finally {
    activeRequest = undefined;
  }
}

await writeHeartbeat();
log("info", "notification.scheduler.started", {
  endpoint: `${configuration.endpoint.origin}${configuration.endpoint.pathname}`,
  intervalMs: configuration.intervalMs,
  maxConsecutiveFailures: configuration.maxConsecutiveFailures,
  requestTimeoutMs: configuration.requestTimeoutMs,
});

while (!stopping) {
  await processNotificationBatch();
  await writeHeartbeat();

  if (consecutiveFailures >= configuration.maxConsecutiveFailures) {
    log("error", "notification.scheduler.failure_limit_reached", {
      consecutiveFailures,
    });
    process.exitCode = 1;
    break;
  }
  if (!stopping) await waitForNextRun();
}

log("info", "notification.scheduler.stopped", {
  exitCode: process.exitCode ?? 0,
});
