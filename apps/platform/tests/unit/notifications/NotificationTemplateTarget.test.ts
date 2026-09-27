import { describe, expect, it } from "vitest";

import { notificationErrorCodes } from "@/modules/notifications/domain/NotificationErrors";
import {
  notificationTemplateResolutionCandidates,
} from "@/modules/notifications/domain/NotificationTemplateTarget";

describe("notification template target resolution", () => {
  it("resolves application templates from event to catalog to global", () => {
    expect(notificationTemplateResolutionCandidates("application.submitted"))
      .toEqual([
        { eventKey: "application.submitted", scope: "EVENT" },
        { catalogKey: "APPLICATIONS", scope: "CATALOG" },
        { scope: "GLOBAL" },
      ]);
  });

  it("resolves workflow templates through the workflow catalog", () => {
    expect(notificationTemplateResolutionCandidates("workflow.task.assigned"))
      .toEqual([
        { eventKey: "workflow.task.assigned", scope: "EVENT" },
        { catalogKey: "WORKFLOW", scope: "CATALOG" },
        { scope: "GLOBAL" },
      ]);
  });

  it("rejects unknown events before target lookup", () => {
    expect(() => notificationTemplateResolutionCandidates("unknown.event"))
      .toThrow(expect.objectContaining({
        code: notificationErrorCodes.unknownEvent,
      }));
  });
});

