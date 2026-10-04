import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { persistStageCompletion } from "@/modules/workflows/infrastructure/StageCompletionRepository";

const dialect = new PgDialect();

describe("closing a source stage for Return", () => {
  it.each(["RETURN", undefined] as const)(
    "closes open tasks using the %s policy",
    async (closure) => {
      const where = vi.fn((statement: SQL) => statement);
      const updateValues: Record<string, unknown>[] = [];
      const insertValues: Record<string, unknown>[] = [];
      const returning = vi
        .fn()
        .mockResolvedValueOnce([{ id: "stage" }])
        .mockResolvedValueOnce([{ id: "unfinished" }]);
      const update = {
        set: vi.fn((values) => {
          updateValues.push(values);
          return update;
        }),
        where: vi.fn((statement) => {
          where(statement);
          return update;
        }),
        returning,
      };
      const transaction = {
        update: vi.fn(() => update),
        insert: vi.fn(() => ({
          values: vi.fn(async (values) => {
            insertValues.push(values);
          }),
        })),
      };
      await persistStageCompletion(transaction as never, {
        actorId: "actor",
        completedAt: new Date(),
        correlationId: "correlation",
        closure,
        requirements: [],
        target: {
          stageInstanceId: "stage",
          status: "ACTIVE",
          stageKey: "C",
          workflowInstanceId: "workflow",
        } as never,
      });
      const filter = dialect.sqlToQuery(where.mock.calls[1][0]);
      expect(filter.sql).toContain("NOT IN ('COMPLETED', 'CANCELLED')");
      expect(filter.params).toContain("stage");
      expect(filter.sql.includes("definition.required = FALSE")).toBe(
        closure !== "RETURN",
      );
      expect(updateValues[0].status).toBe("COMPLETED");
      expect(updateValues[1].status).toBe("CANCELLED");
      expect(insertValues[0]).toMatchObject({
        payload: {
          closure: closure ?? "REVIEW_COMPLETED",
          cancelledTaskIds: ["unfinished"],
        },
      });
      expect(insertValues[1]).toMatchObject({
        after: { closure: closure ?? "REVIEW_COMPLETED", status: "COMPLETED" },
      });
    },
  );

  it("does not touch tasks when the source stage is already closed", async () => {
    const update = {
      set: vi.fn(() => update),
      where: vi.fn(() => update),
      returning: vi.fn().mockResolvedValue([]),
    };
    const transaction = { update: vi.fn(() => update), insert: vi.fn() };
    const result = await persistStageCompletion(transaction as never, {
      actorId: "actor",
      completedAt: new Date(),
      correlationId: "correlation",
      closure: "RETURN",
      requirements: [],
      target: { stageInstanceId: "stage" } as never,
    });
    expect(result).toBeNull();
    expect(transaction.update).toHaveBeenCalledOnce();
    expect(transaction.insert).not.toHaveBeenCalled();
  });
});
