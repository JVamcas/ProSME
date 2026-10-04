import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  execute: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
  values: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
  getDatabase: () => ({
    execute: database.execute,
    transaction: database.transaction,
  }),
}));

import {
  listNotificationEventRuleRecords,
  updateNotificationChannelRecord,
  updateNotificationEventRuleRecord,
} from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";
import { retryNotificationDeliveryRecord } from "@/modules/notifications/infrastructure/NotificationDeliveryAdministrationRepository";

beforeEach(() => {
  vi.clearAllMocks();
  database.insert.mockReturnValue({ values: database.values });
  database.transaction.mockImplementation(async (callback) => callback({
    execute: database.execute,
    insert: database.insert,
  }));
});

describe("notification administration repository", () => {
  it("returns the projected event rule register rows", async () => {
    const rows = [{
      catalogKey: "WORKFLOW",
      eventKey: "workflow.task.assigned",
      recipients: [{
        channels: [{ code: "EMAIL", displayName: "Email" }],
        isRequired: true,
        recipientType: "ASSIGNED_USER",
      }],
    }];
    database.execute.mockResolvedValueOnce({ rows });

    await expect(listNotificationEventRuleRecords({
      catalogKey: "WORKFLOW",
      search: "assigned",
    })).resolves.toEqual(rows);

    expect(database.execute).toHaveBeenCalledTimes(1);
  });

  it("updates a channel and its audit record in one transaction", async () => {
    database.execute.mockResolvedValueOnce({ rows: [{ code: "EMAIL" }] });

    await expect(updateNotificationChannelRecord({
      actorId: "80000000-0000-4000-8000-000000000001",
      channelCode: "EMAIL",
      correlationId: "correlation-channel-update",
      update: {
        expectedUpdatedAt: "2026-09-28T10:00:00.000Z",
        isEnabled: false,
        sortOrder: 10,
      },
    })).resolves.toEqual({ code: "EMAIL" });

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.execute).toHaveBeenCalledTimes(1);
    expect(database.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "NOTIFICATION_CHANNEL_UPDATED",
      changes: {
        channelCode: "EMAIL",
        correlationId: "correlation-channel-update",
      },
    }));
  });

  it("replaces recipient types and channel bindings in one transaction", async () => {
    database.execute
      .mockResolvedValueOnce({ rows: [{
        id: "83000000-0000-4000-8000-000000000001",
      }] })
      .mockResolvedValue({ rows: [] });

    await expect(updateNotificationEventRuleRecord({
      actorId: "80000000-0000-4000-8000-000000000001",
      correlationId: "correlation-rule-update",
      eventKey: "workflow.information-request.created",
      update: {
        eventEnabled: true,
        expectedUpdatedAt: "2026-09-28T10:00:00.000Z",
        isEnabled: true,
        recipients: [{
          channelCodes: ["EMAIL"],
          isRequired: true,
          recipientType: "ASSIGNED_USER",
        }],
      },
    })).resolves.toEqual({
      eventKey: "workflow.information-request.created",
    });

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.execute).toHaveBeenCalledTimes(4);
    expect(database.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "NOTIFICATION_EVENT_RULE_UPDATED",
    }));
  });

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

  it("redrives a dead-letter delivery through a fresh attempt cycle", async () => {
    database.execute
      .mockResolvedValueOnce({ rows: [{
        outboxId: "82000000-0000-4000-8000-000000000001",
        status: "DEAD_LETTER",
      }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(retryNotificationDeliveryRecord({
      actorId: "80000000-0000-4000-8000-000000000001",
      correlationId: "correlation-dead-letter",
      deliveryId: "81000000-0000-4000-8000-000000000001",
      reason: "Provider configuration was corrected.",
    })).resolves.toEqual({ outcome: "SCHEDULED" });

    expect(database.execute).toHaveBeenCalledTimes(3);
    expect(database.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "NOTIFICATION_DELIVERY_RETRY_REQUESTED",
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
