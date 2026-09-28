import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  execute: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
  values: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
  getDatabase: () => ({ transaction: database.transaction }),
}));

import { retryNotificationDeliveryRecord } from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";

beforeEach(() => {
  vi.clearAllMocks();
  database.insert.mockReturnValue({ values: database.values });
  database.transaction.mockImplementation(async (callback) => callback({
    execute: database.execute,
    insert: database.insert,
  }));
});

describe("notification administration repository", () => {
  it("atomically schedules an eligible failed delivery and writes its audit record", async () => {
    database.execute
      .mockResolvedValueOnce({ rows: [{
        outboxId: "82000000-0000-4000-8000-000000000001",
        status: "FAILED",
      }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(retryNotificationDeliveryRecord({
      actorId: "80000000-0000-4000-8000-000000000001",
      correlationId: "correlation-1",
      deliveryId: "81000000-0000-4000-8000-000000000001",
      reason: "Provider configuration was corrected.",
    })).resolves.toEqual({ outcome: "SCHEDULED" });

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.execute).toHaveBeenCalledTimes(3);
    expect(database.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "NOTIFICATION_DELIVERY_RETRY_REQUESTED",
      actorId: "80000000-0000-4000-8000-000000000001",
      changes: expect.objectContaining({
        deliveryId: "81000000-0000-4000-8000-000000000001",
        reason: "Provider configuration was corrected.",
      }),
    }));
  });

  it("treats a concurrent already-scheduled retry as an idempotent success", async () => {
    database.execute.mockResolvedValueOnce({ rows: [{
      outboxId: "82000000-0000-4000-8000-000000000001",
      status: "PENDING",
    }] });

    await expect(retryNotificationDeliveryRecord({
      actorId: "80000000-0000-4000-8000-000000000001",
      correlationId: "correlation-2",
      deliveryId: "81000000-0000-4000-8000-000000000001",
      reason: "Duplicate operator request.",
    })).resolves.toEqual({ outcome: "ALREADY_SCHEDULED" });

    expect(database.execute).toHaveBeenCalledTimes(1);
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("does not reset a sent delivery", async () => {
    database.execute.mockResolvedValueOnce({ rows: [{
      outboxId: "82000000-0000-4000-8000-000000000001",
      status: "SENT",
    }] });

    await expect(retryNotificationDeliveryRecord({
      actorId: "80000000-0000-4000-8000-000000000001",
      correlationId: "correlation-3",
      deliveryId: "81000000-0000-4000-8000-000000000001",
      reason: "Should remain sent.",
    })).resolves.toEqual({ outcome: "INELIGIBLE" });

    expect(database.execute).toHaveBeenCalledTimes(1);
    expect(database.insert).not.toHaveBeenCalled();
  });
});
