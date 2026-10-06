import type { ClientField, GlobalBeforeChangeHook, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";

import { cmsPermissionCode } from "@/auth/authorization/permissions";
import {
  homeEditorFields,
  homeEditorSections,
} from "@/modules/content/ui/admin/HomeEditorSections";
import { Homepage } from "@/payload/globals/Homepage";
import { homePublishingFields } from "@/payload/fields/publishing";

async function changeHome(
  data: Record<string, unknown>,
  permissions: string[],
  originalDoc: Record<string, unknown> = {},
) {
  const guard = Homepage.hooks?.beforeChange?.[0];
  if (!guard) throw new Error("Missing Home publish guard");

  return guard({
    data,
    originalDoc,
    req: { user: { capabilities: permissions } } as unknown as PayloadRequest,
  } as Parameters<GlobalBeforeChangeHook>[0]);
}

describe("Home draft and publish controls", () => {
  it("hides stored review fields in every Home section", () => {
    expect(homePublishingFields).toHaveLength(2);
    for (const section of Object.keys(homeEditorSections)) {
      const fields = homeEditorFields(
        homePublishingFields as ClientField[],
        section as keyof typeof homeEditorSections,
      );
      expect(fields).toEqual([
        expect.objectContaining({
          name: "reviewStatus",
          admin: expect.objectContaining({ hidden: true }),
        }),
        expect.objectContaining({
          name: "reviewNotes",
          admin: expect.objectContaining({ hidden: true }),
        }),
      ]);
    }
  });

  it.each([undefined, "draft", "inReview", "approved"])(
    "publishes directly with previous review status %s",
    async (reviewStatus) => {
      const data = { _status: "published" };
      await expect(
        changeHome(
          data,
          [cmsPermissionCode("site-settings", "publish")],
          { reviewStatus },
        ),
      ).resolves.toEqual({ _status: "published", reviewStatus: "approved" });
    },
  );

  it.each([
    { permissions: [] },
    { permissions: [cmsPermissionCode("site-settings", "update")] },
    { permissions: [cmsPermissionCode("news", "publish")] },
  ])(
    "rejects publishing without Home publishing permission: $permissions",
    async ({ permissions }) => {
      const data = { _status: "published" };
      await expect(changeHome(data, permissions)).rejects.toThrow(
        "Publishing requires the cms.site-settings.publish capability",
      );
      expect(data).not.toHaveProperty("reviewStatus");
    },
  );

  it("saves drafts without approval or publishing permission", async () => {
    await expect(
      changeHome(
        { _status: "draft", title: "Draft headline" },
        [cmsPermissionCode("site-settings", "update")],
      ),
    ).resolves.toEqual({ _status: "draft", title: "Draft headline" });
  });

  it("removes the Edit tab while retaining draft, publish, Versions and API configuration", () => {
    const edit = Homepage.admin?.components?.views?.edit;
    if (!edit || typeof edit === "string" || !("default" in edit)) {
      throw new Error("Missing Home edit configuration");
    }
    expect(edit.default?.tab?.condition?.({} as never)).toBe(false);
    expect(edit).not.toHaveProperty("versions");
    expect(edit).not.toHaveProperty("api");
    expect(Homepage.admin?.hideAPIURL).not.toBe(true);
    expect(Homepage.versions).toMatchObject({ drafts: true });
    expect(Homepage.admin?.components?.elements).toMatchObject({
      SaveDraftButton: expect.stringContaining("CmsSaveDraftButton"),
      PublishButton: expect.stringContaining("CmsPublishButton"),
    });
  });
});
