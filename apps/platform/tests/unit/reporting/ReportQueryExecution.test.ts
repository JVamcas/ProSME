import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ releases: [] as ReturnType<typeof vi.fn>[] }));
vi.mock("server-only", () => ({}));
vi.mock("pg-cursor", () => ({
  default: class {
    private exhausted = false;
    read(_count: number, callback: (error: unknown, rows: string[][], result?: unknown) => void) {
      if (this.exhausted) {
        callback(undefined, []);
        return;
      }
      this.exhausted = true;
      callback(undefined, [["Synthetic reference"]], {
        fields: [{ name: "reference", dataTypeID: 25 }],
      });
    }
    async close() {}
  },
}));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: () => ({
    async connect() {
      const release = vi.fn();
      mocks.releases.push(release);
      return {
        release,
        query(statement: unknown) {
          if (typeof statement === "string") {
            return Promise.resolve({ rows: [{ allowed: true }] });
          }
          return statement;
        },
      };
    },
  }),
}));

import { executeReportQuery } from "@/modules/reporting/infrastructure/ReportQueryRepository";
import { reportQueryLimits } from "@/modules/reporting/domain/ReportQueryLimits";
import { applicationReportDataset as dataset } from "../../support/ReportDatasetFixture";

const originalLimits = { ...reportQueryLimits };
const query = {
  dataset,
  sql: "SELECT reference FROM app_reporting_dataset_applications_v1",
  values: [],
  columns: [{ name: "reference", type: "text" as const }],
  scope: {
    actorId: "00000000-0000-4000-8000-000000000001",
    datasetKey: dataset.key,
    runAt: "2026-10-08T12:00:00Z",
    timezone: "Africa/Windhoek",
  },
};

afterEach(() => {
  Object.assign(reportQueryLimits, originalLimits);
  mocks.releases.length = 0;
  vi.useRealTimers();
});

describe("bounded report execution", () => {
  it.each(["rows", "bytes"] as const)(
    "fails before consuming a batch exceeding the %s budget",
    async (limit) => {
      Object.assign(reportQueryLimits, { [limit]: 0 });
      const onBatch = vi.fn();
      await expect(executeReportQuery({ ...query, onBatch })).rejects.toThrow("limit exceeded");
      expect(onBatch).not.toHaveBeenCalled();
      expect(mocks.releases[0]).toHaveBeenCalledWith(false);
    },
  );

  it("rejects excess concurrent executions and releases capacity after both consumers finish", async () => {
    const starts = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    let started = 0;
    const onBatch = async () => {
      if (++started === 2) {
        starts.resolve();
      }
      await finish.promise;
    };
    const executions = [
      executeReportQuery({ ...query, onBatch }),
      executeReportQuery({ ...query, onBatch }),
    ];
    try {
      await starts.promise;
      await expect(executeReportQuery({ ...query, onBatch })).rejects.toThrow("capacity");
    } finally {
      finish.resolve();
      await Promise.all(executions);
    }
    await expect(
      executeReportQuery({ ...query, onBatch: async () => undefined }),
    ).resolves.toMatchObject({ rows: 1 });
  });

  it("aborts an unresponsive output consumer at the deadline and destroys its connection", async () => {
    vi.useFakeTimers();
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();
    const execution = executeReportQuery({
      ...query,
      onBatch: async () => {
        started.resolve();
        await finish.promise;
      },
    });
    const assertion = expect(execution).rejects.toThrow("time limit");
    try {
      await started.promise;
      await vi.advanceTimersByTimeAsync(reportQueryLimits.executionTimeoutMs);
      await assertion;
      expect(mocks.releases[0]).toHaveBeenCalledWith(true);
    } finally {
      finish.resolve();
    }
  });
});
