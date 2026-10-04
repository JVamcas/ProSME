import { randomUUID } from "node:crypto";

export function positiveInteger(environment, name, fallback, minimum = 1_000) {
  const raw = environment[name] ?? String(fallback);
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || String(value) !== raw || value < minimum) {
    throw new Error(`${name} must be an integer of at least ${minimum}.`);
  }
  return value;
}

export function processorEndpoint(value) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error("Processor endpoints must be safe HTTP(S) URLs.");
  }
  return url;
}

export function isBatchResult(value, fields) {
  return Boolean(value && typeof value === "object" && fields.every(
    (field) => Number.isSafeInteger(value[field]) && value[field] >= 0,
  ));
}

// Each loop awaits its own request. Separate loops never wait on one another.
export function createScheduledProcessor(configuration, dependencies) {
  let consecutiveFailures = 0;
  let activeRequest;
  let stopping = false;
  let wakeWait;

  async function processBatch() {
    const runId = randomUUID();
    const startedAt = Date.now();
    activeRequest = new AbortController();
    const signal = AbortSignal.any([
      activeRequest.signal,
      AbortSignal.timeout(configuration.requestTimeoutMs),
    ]);
    try {
      const response = await dependencies.fetch(configuration.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configuration.secret}`,
          "X-Request-Id": runId,
        },
        signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`Processor returned HTTP ${response.status}.`);
      }
      if (!isBatchResult(body?.data, configuration.resultFields)) {
        throw new Error("Processor returned an invalid batch response.");
      }
      consecutiveFailures = 0;
      if (body.data.claimed > 0) {
        dependencies.log("info", "scheduler.batch_completed", {
          processor: configuration.name,
          counts: body.data,
          durationMs: Date.now() - startedAt,
          runId,
        });
      }
    } catch (error) {
      if (stopping && activeRequest.signal.aborted) return;
      consecutiveFailures += 1;
      dependencies.log("error", "scheduler.batch_failed", {
        processor: configuration.name,
        consecutiveFailures,
        durationMs: Date.now() - startedAt,
        errorType: error instanceof Error ? error.name : "UnknownError",
        runId,
      });
    } finally {
      activeRequest = undefined;
    }
  }

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

  return {
    async run() {
      await dependencies.heartbeat(configuration.name, 0);
      while (!stopping) {
        await processBatch();
        await dependencies.heartbeat(configuration.name, consecutiveFailures);
        if (!stopping) await waitForNextRun();
      }
    },
    stop() {
      stopping = true;
      activeRequest?.abort();
      wakeWait?.();
    },
  };
}
