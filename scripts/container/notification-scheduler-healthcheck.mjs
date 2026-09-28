import { stat } from "node:fs/promises";

const heartbeatPath = "/tmp/notification-scheduler-heartbeat";
const intervalMs = Number.parseInt(
  process.env.NOTIFICATION_PROCESSOR_INTERVAL_MS ?? "60000",
  10,
);
const requestTimeoutMs = Number.parseInt(
  process.env.NOTIFICATION_SCHEDULER_REQUEST_TIMEOUT_MS ?? "60000",
  10,
);
const maximumAgeMs = intervalMs + requestTimeoutMs + 30_000;

try {
  const heartbeat = await stat(heartbeatPath);
  if (Date.now() - heartbeat.mtimeMs > maximumAgeMs) process.exit(1);
} catch {
  process.exit(1);
}
