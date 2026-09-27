import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/notifications/infrastructure/NotificationConfigurationSeedRepository",
  () => ({
    seedNotificationConfiguration: vi.fn(),
  }),
);

import { seedInitialNotificationConfiguration } from "@/modules/notifications/application/ServerNotificationConfigurationSeedService";
import { notificationEventSeeds } from "@/modules/notifications/domain/NotificationSeedConfiguration";
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
  it("uses the two compatible initial event rules", async () => {
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
      ]),
    );
    expect(seedNotificationConfiguration).toHaveBeenCalledOnce();
  });
});
