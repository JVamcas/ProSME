import type { Field } from "payload";
import { describe, expect, it } from "vitest";

import { Resources } from "@/payload/collections/content/Resources";
import { publishingFields } from "@/payload/fields/publishing";
import { seoFields } from "@/payload/fields/seo";

function flattenFields(fields: Field[]): Field[] {
  return fields.flatMap((field) => {
    if ("fields" in field) {
      return flattenFields(field.fields);
    }
    return [field];
  });
}

describe("Resource Centre editor fields", () => {
  const fields = flattenFields(Resources.fields);

  it("shows only the resource and document controls", () => {
    const visibleNames = fields
      .filter((field) => {
        const hidden =
          field.admin && "hidden" in field.admin && field.admin.hidden;
        return "name" in field && !hidden;
      })
      .map((field) => ("name" in field ? field.name : undefined));

    expect(visibleNames).toEqual([
      "resourceName",
      "title",
      "description",
      "file",
      "thumbnail",
      "externalUrl",
    ]);
  });

  it.each([
    "slug",
    "body",
    "publishedAt",
    "reviewStatus",
    "reviewNotes",
    "seoTitle",
    "seoDescription",
    "excludeFromSearch",
  ])("retains stored %s data without exposing an editor control", (name) => {
    expect(
      fields.find((field) => "name" in field && field.name === name),
    ).toMatchObject({ admin: { hidden: true } });
  });

  it("preserves draft/publish controls and other collections' shared fields", () => {
    expect(Resources.versions).toMatchObject({ drafts: true });
    expect(Resources.admin?.components?.edit).toMatchObject({
      SaveDraftButton: expect.stringContaining("CmsSaveDraftButton"),
      PublishButton: expect.stringContaining("CmsPublishButton"),
    });
    for (const field of [...publishingFields, ...seoFields]) {
      const hidden =
        field.admin && "hidden" in field.admin && field.admin.hidden;
      expect(hidden).not.toBe(true);
    }
  });
});
