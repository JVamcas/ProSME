import { afterEach, describe, expect, it, vi } from "vitest";
import { createScheduledProcessor } from "../../../../../scripts/container/scheduled-processor.mjs";

const config = {
  endpoint: new URL("http://localhost/processor"),
  intervalMs: 1_000,
  name: "workflow",
  requestTimeoutMs: 60_000,
  resultFields: ["claimed", "failed", "processed", "skipped"],
  secret: "test-only-service-secret",
};
const batchResponse = () => Promise.resolve({
  ok: true,
  json: async () => ({ data: { claimed: 1, failed: 0, processed: 1, skipped: 0 } }),
});

afterEach(() => vi.useRealTimers());

describe("independent scheduler loops", () => {
  it("keeps notifications running while workflow requests are pending and never overlaps workflow runs", async () => {
    vi.useFakeTimers();
    let finishWorkflow!: (response: Awaited<ReturnType<typeof batchResponse>>) => void;
    const workflowFetch = vi.fn(() => new Promise<Awaited<ReturnType<typeof batchResponse>>>((resolve) => {
      finishWorkflow = resolve;
    }));
    const notificationFetch = vi.fn(batchResponse);
    const heartbeat = vi.fn().mockResolvedValue(undefined);
    const workflow = createScheduledProcessor(config, { fetch: workflowFetch, heartbeat, log: vi.fn() });
    const notification = createScheduledProcessor({ ...config, name: "notification" }, {
      fetch: notificationFetch, heartbeat, log: vi.fn(),
    });
    const runs = [workflow.run(), notification.run()];
    await vi.advanceTimersByTimeAsync(3_000);
    expect(workflowFetch).toHaveBeenCalledTimes(1);
    expect(notificationFetch).toHaveBeenCalledTimes(4);
    finishWorkflow(await batchResponse());
    await vi.advanceTimersByTimeAsync(0);
    workflow.stop();
    notification.stop();
    await Promise.all(runs);
  });

  it("retries failed requests without stopping the other processor", async () => {
    vi.useFakeTimers();
    const log = vi.fn();
    const heartbeat = vi.fn().mockResolvedValue(undefined);
    const workflowFetch = vi.fn().mockRejectedValue(new Error("private-token@example.test"));
    const notificationFetch = vi.fn(batchResponse);
    const workflow = createScheduledProcessor(config, { fetch: workflowFetch, heartbeat, log });
    const notification = createScheduledProcessor({ ...config, name: "notification" }, {
      fetch: notificationFetch, heartbeat, log,
    });
    const runs = [workflow.run(), notification.run()];
    await vi.advanceTimersByTimeAsync(6_000);
    expect(workflowFetch).toHaveBeenCalledTimes(7);
    expect(notificationFetch).toHaveBeenCalledTimes(7);
    expect(heartbeat).toHaveBeenCalledWith("workflow", 7);
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-token@example.test");
    workflow.stop();
    notification.stop();
    await Promise.all(runs);
  });

  it("aborts an active request on shutdown", async () => {
    const fetch = vi.fn((_: unknown, options: { signal: AbortSignal }) => new Promise<never>((_, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")));
    }));
    const processor = createScheduledProcessor(config, {
      fetch, heartbeat: vi.fn().mockResolvedValue(undefined), log: vi.fn(),
    });
    const run = processor.run();
    await Promise.resolve();
    processor.stop();
    await run;
    expect(fetch.mock.calls[0]![1].signal.aborted).toBe(true);
  });

  it("times out a stalled processor request and remains retryable", async () => {
    const timedOut = Promise.withResolvers<void>();
    const fetch = vi.fn((_: unknown, options: { signal: AbortSignal }) => new Promise<never>((_, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("timeout")));
    }));
    const processor = createScheduledProcessor({ ...config, requestTimeoutMs: 25 }, {
      fetch,
      heartbeat: async (_, failures) => {
        if (failures === 1) timedOut.resolve();
      },
      log: vi.fn(),
    });
    const run = processor.run();
    await timedOut.promise;
    processor.stop();
    await run;
    expect(fetch.mock.calls[0]![1].signal.aborted).toBe(true);
  });
});
