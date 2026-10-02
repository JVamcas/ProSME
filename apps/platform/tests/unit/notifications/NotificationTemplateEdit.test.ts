import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/notifications/infrastructure/NotificationTemplateRepository", () => ({
  findNotificationTemplateTarget: vi.fn(),
  findNotificationTemplateVersion: vi.fn(),
  createNotificationTemplateDraft: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { editNotificationTemplate } from "@/modules/notifications/application/ServerNotificationTemplateService";
import {
  createNotificationTemplateDraft,
  findNotificationTemplateTarget,
  findNotificationTemplateVersion,
} from "@/modules/notifications/infrastructure/NotificationTemplateRepository";

const targetId = "80000000-0000-4000-8000-000000000001";
const versionId = "80000000-0000-4000-8000-000000000002";
const actor: AuthenticatedUser = {
  id: targetId,
  createdAt: new Date(),
  updatedAt: new Date(),
  displayName: "Operator",
  email: "operator@example.com",
  userType: "staff",
  lastLoginAt: null,
  identitySubject: "firebase-operator",
  roleCodes: new Set(["OPERATIONS"]),
  status: "active",
  capabilities: new Set([permissionCodes.notificationTemplateImport]),
};
const source = {
  contentSha256: "existing-html-hash",
  createdAt: new Date(),
  htmlTemplate: "<p>Hello {{recipientName}}</p>",
  id: versionId,
  mediaType: "text/html",
  plainTextTemplate: "Hello {{recipientName}}",
  publishedAt: new Date(),
  sourceFileName: "application-submitted.html",
  status: "PUBLISHED" as const,
  subjectTemplate: "Original subject",
  versionNumber: 2,
};

function edit(subjectTemplate = "Updated {{applicationReference}}", user = actor) {
  return editNotificationTemplate(
    user, "EMAIL", targetId, versionId, { subjectTemplate }, "edit-correlation",
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findNotificationTemplateTarget).mockResolvedValue({
    catalogKey: "APPLICATION",
    catalogName: "Application",
    channelCode: "EMAIL",
    defaultSubjectTemplate: "Default",
    description: "Submitted",
    displayName: "Application submitted",
    eventKey: "application.submitted",
    id: targetId,
    isEnabled: true,
    scope: "EVENT",
    targetUpdatedAt: new Date(),
  });
  vi.mocked(findNotificationTemplateVersion).mockResolvedValue(source);
  vi.mocked(createNotificationTemplateDraft).mockResolvedValue({
    ...source, subjectTemplate: "Updated {{applicationReference}}",
    publishedAt: null, status: "DRAFT", versionNumber: 3,
  });
});

describe("notification subject editing", () => {
  it.each(["DRAFT", "PUBLISHED", "RETIRED"] as const)(
    "creates a new draft from a %s version, retaining its body and source",
    async (status) => {
      vi.mocked(findNotificationTemplateVersion).mockResolvedValue({ ...source, status });
      await expect(edit()).resolves.toMatchObject({ status: "DRAFT", versionNumber: 3 });
      expect(createNotificationTemplateDraft).toHaveBeenCalledWith(expect.objectContaining({
        htmlTemplate: source.htmlTemplate,
        plainTextTemplate: source.plainTextTemplate,
        sourceFileName: source.sourceFileName,
        contentSha256: source.contentSha256,
        subjectTemplate: "Updated {{applicationReference}}",
        actorId: actor.id,
        auditMetadata: expect.objectContaining({ templateVersionId: versionId }),
      }));
      expect(source.subjectTemplate).toBe("Original subject");
    },
  );

  it("checks permission before reading template content", async () => {
    await expect(edit("Updated", { ...actor, capabilities: new Set() }))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(findNotificationTemplateTarget).not.toHaveBeenCalled();
    expect(createNotificationTemplateDraft).not.toHaveBeenCalled();
  });

  it("checks the channel and target relationship before loading a version", async () => {
    vi.mocked(findNotificationTemplateTarget).mockResolvedValue(undefined);
    await expect(edit()).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(findNotificationTemplateTarget).toHaveBeenCalledWith("EMAIL", targetId);
    expect(findNotificationTemplateVersion).not.toHaveBeenCalled();
  });

  it("rejects a version outside the requested target", async () => {
    vi.mocked(findNotificationTemplateVersion).mockResolvedValue(undefined);
    await expect(edit()).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(findNotificationTemplateVersion).toHaveBeenCalledWith(targetId, versionId);
    expect(createNotificationTemplateDraft).not.toHaveBeenCalled();
  });

  it.each(["", " ", "line\nbreak", "x".repeat(501), "{{unknownField}}"])(
    "rejects invalid subject %s", async (subject) => {
      await expect(edit(subject)).rejects.toThrow();
      expect(createNotificationTemplateDraft).not.toHaveBeenCalled();
    },
  );
});
