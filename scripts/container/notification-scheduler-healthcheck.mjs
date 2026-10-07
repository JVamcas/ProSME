import { readFile, stat } from "node:fs/promises";

const failureLimit = Number.parseInt(
  process.env.NOTIFICATION_SCHEDULER_MAX_CONSECUTIVE_FAILURES ?? "5",
  10,
);

try {
  await Promise.all(
    ["notification", "workflow", "reporting"].map(async (name) => {
      const prefix = name.toUpperCase();
      const intervalMs = Number.parseInt(
        process.env[`${prefix}_PROCESSOR_INTERVAL_MS`] ??
          (name === "reporting" ? "15000" : "60000"),
        10,
      );
      const requestTimeoutMs = Number.parseInt(
        process.env[`${prefix}_SCHEDULER_REQUEST_TIMEOUT_MS`] ?? "60000",
        10,
      );
      const heartbeatPath = `/tmp/${name}-scheduler-heartbeat`;
      const [heartbeat, raw] = await Promise.all([
        stat(heartbeatPath),
        readFile(heartbeatPath, "utf8"),
      ]);
      if (
        Date.now() - heartbeat.mtimeMs >
          intervalMs + requestTimeoutMs + 30_000 ||
        JSON.parse(raw).consecutiveFailures >= failureLimit
      ) {
        throw new Error("Processor is unhealthy.");
      }
    }),
  );
} catch {
  process.exitCode = 1;
}
