vi.mock("server-only", () => ({}));
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  loadWorkflowActionNotificationRecipients,
  insertWorkflowActionNotifications,
} from "@/modules/notifications/infrastructure/WorkflowActionNotificationRepository";
import {
  enabled,
  client,
  owner,
  actor,
  inactive,
  role,
  application,
  stage,
  row,
  occurrence,
  transaction,
  migration,
} from "./support/WorkflowActionNotificationDatabaseFixture";

describe.skipIf(!enabled)("workflow action notifications on PostgreSQL", () => {
  it("reapplies the migration without changing configured notifications", async () => {
    const id = randomUUID();
    await client!.query(
      "INSERT INTO app_workflow_action_definitions(id) VALUES ($1)",
      [id],
    );
    expect(
      (
        await client!.query(
          "SELECT notifications FROM app_workflow_action_definitions WHERE id=$1",
          [id],
        )
      ).rows[0].notifications,
    ).toEqual([]);
    const configured = [row("APPLICATION_OWNER")];
    await client!.query(
      "UPDATE app_workflow_action_definitions SET notifications=$1 WHERE id=$2",
      [JSON.stringify(configured), id],
    );
    await client!.query(await migration());
    expect(
      (
        await client!.query(
          "SELECT notifications FROM app_workflow_action_definitions WHERE id=$1",
          [id],
        )
      ).rows[0].notifications,
    ).toEqual(configured);
    expect(
      (
        await client!.query(
          "SELECT count(*)::int AS count FROM app_notification_events",
        )
      ).rows[0].count,
    ).toBe(1);
  });
  it("resolves every supported recipient in one bounded query and excludes inactive users", async () => {
    const configured = [
      row("APPLICATION_OWNER"),
      row("ACTION_ACTOR"),
      row("ASSIGNED_USER"),
      row("SPECIFIC_USER", owner),
      row("SPECIFIC_ROLE", role),
      row("SPECIFIC_USER", inactive),
    ];
    const recipients = await transaction((tx) =>
      loadWorkflowActionNotificationRecipients(tx, {
        stageInstanceId: stage,
        actorId: actor,
        notifications: configured,
      }),
    );
    expect(recipients).toHaveLength(5);
    expect(recipients.map((item) => item.userId)).not.toContain(inactive);
    expect(
      recipients.find((item) => item.recipientType === "ASSIGNED_USER")?.userId,
    ).toBe(actor);
    expect(recipients.every((item) => item.stageName === "Assessment")).toBe(
      true,
    );
    expect(Object.keys(recipients[0]).sort()).toEqual(
      [
        "notificationId",
        "userId",
        "displayName",
        "email",
        "recipientType",
        "stageName",
      ].sort(),
    );
  });
  it("creates independent rows for matching messages and suppresses occurrence replays", async () => {
    const first = occurrence("execution:one"),
      second = occurrence("execution:two");
    const write = (items: (typeof first)[]) =>
      transaction((tx) =>
        insertWorkflowActionNotifications(tx, {
          applicationId: application,
          correlationId: "test",
          occurrences: items,
        }),
      );
    await write([first, second]);
    await write([{ ...first, id: randomUUID() }]);
    expect(
      (
        await client!.query(
          "SELECT count(*)::int AS count FROM app_notification_outbox",
        )
      ).rows[0].count,
    ).toBe(2);
    expect(
      (
        await client!.query(
          "SELECT count(*)::int AS count FROM app_notification_deliveries",
        )
      ).rows[0].count,
    ).toBe(2);
    const saved = (
      await client!.query(
        "SELECT context FROM app_notification_outbox WHERE id=$1",
        [first.id],
      )
    ).rows[0].context;
    expect(saved).toEqual(first.context);
  });
  it("rolls back messages and deliveries together with the action transaction", async () => {
    await expect(
      transaction(async (tx) => {
        await insertWorkflowActionNotifications(tx, {
          applicationId: application,
          correlationId: "test",
          occurrences: [occurrence()],
        });
        throw new Error("Action failed");
      }),
    ).rejects.toThrow("Action failed");
    expect(
      (
        await client!.query(
          "SELECT count(*)::int AS count FROM app_notification_outbox",
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (
        await client!.query(
          "SELECT count(*)::int AS count FROM app_notification_deliveries",
        )
      ).rows[0].count,
    ).toBe(0);
  });
});
