import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "drizzle/0117_notification_foundation.sql"),
  "utf8",
);

describe("notification foundation migration", () => {
  it("creates the complete module-owned persistence foundation", () => {
    for (const table of [
      "app_notification_channels",
      "app_notification_events",
      "app_notification_event_rules",
      "app_notification_templates",
      "app_notification_template_versions",
      "app_notification_outbox",
      "app_notification_deliveries",
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it("enforces unique event, occurrence, published version, and recipient keys", () => {
    expect(migration).toContain("app_notification_events_key_unique");
    expect(migration).toContain("app_notification_outbox_occurrence_unique");
    expect(migration).toContain("app_notification_template_versions_published_unique");
    expect(migration).toContain("WHERE \"status\" = 'PUBLISHED'");
    expect(migration).toContain("lower(\"recipient_email\")");
  });

  it("adds due-work and delivery-history indexes", () => {
    expect(migration).toContain("app_notification_outbox_due_idx");
    expect(migration).toContain("app_notification_deliveries_due_idx");
    expect(migration).toContain("app_notification_deliveries_history_idx");
  });

  it("makes event keys and occurrence context immutable", () => {
    expect(migration).toContain("notification event keys are immutable");
    expect(migration).toContain(
      "notification occurrence identity and context are immutable",
    );
  });

  it("seeds only canonical notification permissions with narrow grants", () => {
    for (const code of [
      "notifications.configuration.read",
      "notifications.configuration.update",
      "notifications.template.import",
      "notifications.template.publish",
      "notifications.delivery.read",
      "notifications.delivery.retry",
    ]) {
      expect(migration).toContain(`'${code}'`);
    }
    expect(migration).toContain("role_row.\"code\" = 'system_administrator'");
    expect(migration).not.toContain("notifications.manage");
  });
});

