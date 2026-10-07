import { rename, writeFile } from "node:fs/promises";

import {
  createScheduledProcessor,
  positiveInteger,
  processorEndpoint,
} from "./scheduled-processor.mjs";

function log(level, event, context = {}) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "notification-scheduler",
    event,
    ...context,
  });
  const destination = level === "error" ? console.error : console.info;
  destination(record);
}

async function heartbeat(name, consecutiveFailures) {
  const destination = `/tmp/${name}-scheduler-heartbeat`;
  const temporary = `${destination}.tmp`;
  await writeFile(
    temporary,
    JSON.stringify({ consecutiveFailures, timestamp: Date.now() }),
    { mode: 0o600 },
  );
  await rename(temporary, destination);
}

function configuration(name, resultFields) {
  const prefix = name.toUpperCase();
  const secret =
    process.env[`${prefix}_PROCESSOR_SECRET`] ||
    process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      `${prefix}_PROCESSOR_SECRET must have at least 32 characters.`,
    );
  }
  const routes = {
    notification: "notifications",
    workflow: "workflows",
    reporting: "reporting",
  };
  const route = routes[name];
  return {
    name,
    endpoint: processorEndpoint(
      process.env[`${prefix}_PROCESSOR_URL`] ??
        `http://app:3008/api/internal/${route}/process`,
    ),
    intervalMs: positiveInteger(
      process.env,
      `${prefix}_PROCESSOR_INTERVAL_MS`,
      name === "reporting" ? 15_000 : 60_000,
    ),
    requestTimeoutMs: positiveInteger(
      process.env,
      `${prefix}_SCHEDULER_REQUEST_TIMEOUT_MS`,
      60_000,
    ),
    resultFields,
    secret,
  };
}

let processors;
try {
  processors = [
    configuration("notification", [
      "claimed",
      "failed",
      "processed",
      "retrying",
      "sent",
    ]),
    configuration("workflow", ["claimed", "failed", "processed", "skipped"]),
    configuration("reporting", ["claimed", "failed", "processed", "skipped"]),
  ].map((config) => {
    log("info", "scheduler.processor_started", {
      processor: config.name,
      intervalMs: config.intervalMs,
      requestTimeoutMs: config.requestTimeoutMs,
    });
    return createScheduledProcessor(config, {
      fetch,
      log,
      heartbeat,
    });
  });
} catch (error) {
  log("error", "scheduler.configuration_invalid", {
    message:
      error instanceof Error
        ? error.message
        : "Invalid scheduler configuration.",
  });
  process.exit(1);
}

function stop(signal) {
  log("info", "scheduler.shutdown_requested", { signal });
  processors.forEach((processor) => processor.stop());
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));

await Promise.all(processors.map((processor) => processor.run()));
