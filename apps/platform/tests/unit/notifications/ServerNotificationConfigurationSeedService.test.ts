import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/notifications/infrastructure/NotificationConfigurationSeedRepository",
  () => ({
    seedNotificationConfiguration: vi.fn(),
  }),
);

import { seedInitialNotificationConfiguration } from "@/modules/notifications/application/ServerNotificationConfigurationSeedService";
import {
  notificationEventSeeds,
  notificationTemplateTargetSeeds,
} from "@/modules/notifications/domain/NotificationSeedConfiguration";
import { seedNotificationConfiguration } from "@/modules/notifications/infrastructure/NotificationConfigurationSeedRepository";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(seedNotificationConfiguration).mockResolvedValue({
    createdCatalogKeys: [],
    createdChannel: false,
    createdEventKeys: [],
    createdRuleChannelCount: 0,
    createdRuleCount: 0,
    createdRuleRecipientCount: 0,
    createdTargetCount: 0,
  });
});

describe("ServerNotificationConfigurationSeedService", () => {
  it("seeds an editable default rule for every configured event", async () => {
    await expect(seedInitialNotificationConfiguration()).resolves.toEqual({
      createdCatalogKeys: [],
      createdChannel: false,
      createdEventKeys: [],
      createdRuleChannelCount: 0,
      createdRuleCount: 0,
      createdRuleRecipientCount: 0,
      createdTargetCount: 0,
    });
    expect(notificationEventSeeds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "application.submitted",
          recipientType: "APPLICATION_OWNER",
        }),
        expect.objectContaining({
          key: "workflow.task.assigned",
          recipientType: "ASSIGNED_USER",
        }),
        expect.objectContaining({
          key: "workflow.information-request.created",
          recipientType: "APPLICATION_OWNER",
        }),
        expect.objectContaining({
          key: "workflow.information-request.responded",
          recipientType: "ASSIGNED_USER",
        }),
        expect.objectContaining({
          key: "workflow.information-request.closed",
          recipientType: "APPLICATION_OWNER",
        }),
        expect.objectContaining({
          key: "workflow.information-request.expired",
          recipientType: "ASSIGNED_USER",
        }),
      ]),
    );
    expect(notificationTemplateTargetSeeds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          defaultSubjectTemplate: "Application {{applicationReference}} submitted",
          eventKey: "application.submitted",
        }),
        expect.objectContaining({
          defaultSubjectTemplate: "New task assigned for application {{applicationReference}}",
          eventKey: "workflow.task.assigned",
        }),
      ]),
    );
    expect(notificationTemplateTargetSeeds.every(
      (target) => target.defaultSubjectTemplate.trim().length > 0,
    )).toBe(true);
    expect(seedNotificationConfiguration).toHaveBeenCalledOnce();
  });
});
