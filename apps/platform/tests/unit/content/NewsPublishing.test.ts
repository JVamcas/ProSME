import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
} from "payload";
import { describe, expect, it } from "vitest";

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
