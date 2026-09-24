import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTemplateRepository",
  () => ({
    listWorkflowTemplatePage: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { getWorkflowTemplates } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import { listWorkflowTemplatePage } from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { actor } from "./WorkflowTemplateFixtures";

const reader = {
  ...actor,
  capabilities: new Set([permissionCodes.workflowDefinitionRead]),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("workflow template admin list service", () => {
  it("returns every version in the requested page with pagination metadata", async () => {
    vi.mocked(listWorkflowTemplatePage).mockResolvedValue({
      items: [
        {
          currentVersionId: "43333333-3333-4333-8333-333333333333",
          currentVersionNumber: 3,
          currentVersionRowVersion: 4,
          currentVersionStatus: "APPROVED",
          id: "41111111-1111-4111-8111-111111111111",
          metadata: {
            code: "ZEBRA",
            description: "Latest Zebra version",
            name: "Zebra template",
          },
          updatedAt: new Date("2026-09-19T08:00:00.000Z"),
          isLatest: true,
        },
        {
          currentVersionId: "44444444-4444-4444-8444-444444444444",
          currentVersionNumber: 1,
          currentVersionRowVersion: 1,
          currentVersionStatus: "DRAFT",
          id: "42222222-2222-4222-8222-222222222222",
          metadata: {
            code: "ALPHA",
            description: "Alpha draft",
            name: "Alpha template",
          },
          updatedAt: new Date("2026-09-19T09:00:00.000Z"),
          isLatest: false,
        },
      ],
      total: 12,
    });

    await expect(getWorkflowTemplates(reader, 2, 2)).resolves.toEqual({
      items: [
        expect.objectContaining({
          code: "ZEBRA",
          currentVersion: expect.objectContaining({
            number: 3,
            status: "APPROVED",
          }),
        }),
        expect.objectContaining({
          code: "ALPHA",
          currentVersion: expect.objectContaining({
            number: 1,
            status: "DRAFT",
          }),
        }),
      ],
      page: 2,
      pageSize: 2,
      total: 12,
      totalPages: 6,
    });
    expect(listWorkflowTemplatePage).toHaveBeenCalledWith(2, 2);
  });

  it("denies list access without the read permission", async () => {
    await expect(
      getWorkflowTemplates({ ...reader, capabilities: new Set() }, 1, 10),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(listWorkflowTemplatePage).not.toHaveBeenCalled();
  });
});
