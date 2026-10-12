import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionAfterChangeHook,
  PayloadRequest,
} from "payload";
import { describe, expect, it, vi } from "vitest";

import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { News } from "@/payload/collections/content/News";

async function changeNews(data: Record<string, unknown>, permissions: string[]) {
  const guard = News.hooks?.beforeChange?.[0];
  if (!guard) throw new Error("Missing News publishing guard");
  return guard({
    data,
    originalDoc: { slug: "existing-article", reviewStatus: "draft" },
    req: { user: { capabilities: permissions } } as unknown as PayloadRequest,
  } as Parameters<CollectionBeforeChangeHook>[0]);
}

describe("News publishing", () => {
  it("autosaves incomplete drafts and retains explicit Save Draft", () => {
    expect(News.versions).toEqual({
      drafts: {
        autosave: { interval: 2000, showSaveDraftButton: true },
        validate: false,
      },
      maxPerDoc: 50,
    });
  });

  it.each([true, "true"])(
    "records an autosave of a published article as autosaved (%s)",
    async (autosave) => {
      const record = News.hooks?.afterChange?.[0];
      if (!record) throw new Error("Missing News audit hook");
      const create = vi.fn().mockResolvedValue({});
      await record({
        collection: News,
        doc: { id: 42, _status: "draft" },
        previousDoc: { id: 42, _status: "published" },
        operation: "update",
        req: {
          query: { autosave },
          user: { id: 7, email: "editor@example.test" },
          payload: { create },
        },
      } as unknown as Parameters<CollectionAfterChangeHook>[0]);
      expect(create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: "autosaved" }),
      }));
    },
  );

  it.each([
    { permissions: [], allowed: false },
    { permissions: [cmsPermissionCode("resources", "update")], allowed: false },
    { permissions: [cmsPermissionCode("news", "update")], allowed: true },
  ])("enforces News update access for autosaves: %j", async ({ permissions, allowed }) => {
    const update = News.access?.update;
    if (!update) throw new Error("Missing News update access");
    expect(await update({
      req: {
        query: { autosave: "true", draft: "true" },
        user: { capabilities: permissions },
      } as unknown as PayloadRequest,
    })).toBe(allowed);
  });

  it("hides the slug input while retaining required unique article URLs", () => {
    const group = News.fields.find((field) => field.type === "group");
    if (!group || group.type !== "group") throw new Error("Missing article fields");
    expect(group.fields.find((field) => "name" in field && field.name === "slug"))
      .toMatchObject({
        required: true,
        unique: true,
        admin: { hidden: true },
      });
  });

  it.each([
    {
      data: { title: "Business & funding news" },
      expected: "business-funding-news",
    },
    { data: { title: "Café news" }, expected: "cafe-news" },
    {
      data: { title: "New title", slug: "imported-url" },
      expected: "imported-url",
    },
  ])(
    "prepares article URLs without a manual slug input: $expected",
    async ({ data, expected }) => {
      const prepare = News.hooks?.beforeValidate?.[0];
      if (!prepare) throw new Error("Missing News URL preparation");
      const result = await prepare({
        data,
        req: {} as PayloadRequest,
      } as unknown as Parameters<CollectionBeforeValidateHook>[0]);
      expect(result).toMatchObject({ slug: expected });
    },
  );

  it("preserves existing article URLs when the title changes", async () => {
    const prepare = News.hooks?.beforeValidate?.[0];
    if (!prepare) throw new Error("Missing News URL preparation");
    const result = await prepare({
      data: { title: "Changed title" },
      originalDoc: { slug: "existing-article" },
      req: {} as PayloadRequest,
    } as unknown as Parameters<CollectionBeforeValidateHook>[0]);
    expect(result).toEqual({ title: "Changed title" });
  });

  it("approves through Publish with the News publishing permission", async () => {
    await expect(changeNews(
      { _status: "published", title: "Updated article" },
      [cmsPermissionCode("news", "publish")],
    )).resolves.toEqual({
      _status: "published",
      title: "Updated article",
      reviewStatus: "approved",
    });
  });

  it.each([
    { permissions: [] },
    { permissions: [cmsPermissionCode("news", "update")] },
    { permissions: [cmsPermissionCode("resources", "publish")] },
  ])("rejects publishing with nonmatching permissions %j", async ({ permissions }) => {
    await expect(changeNews({ _status: "published" }, permissions))
      .rejects.toThrow("cms.news.publish");
  });

  it("allows saving a draft without approving it", async () => {
    await expect(changeNews(
      { _status: "draft", title: "Draft article" },
      [cmsPermissionCode("news", "update")],
    )).resolves.toEqual({ _status: "draft", title: "Draft article" });
  });
});
