import type { Field, GroupFieldClientProps } from "payload";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  fields: {} as Record<string, { value: unknown }>,
}));

vi.mock("@payloadcms/ui", () => ({
  GroupField: ({ readOnly }: GroupFieldClientProps) => (
    <div data-payload-fields data-read-only={readOnly} />
  ),
  useFormFields: (selector: (state: unknown[]) => unknown) =>
    selector([editor.fields]),
}));

import CmsHomeActionsGroupField from "@/modules/content/ui/admin/CmsHomeActionsGroupField";
import { useHomeActionsPreview } from "@/modules/content/ui/admin/useHomeActionsPreview";
import { defaultHomeActionCards } from "@/modules/content/ContentDefaults";
import { homePageActionCardsFields } from "@/payload/fields/HomePageActionCardsFields";
import { Homepage } from "@/payload/globals/Homepage";

function savedPaths(fields: Field[], prefix = ""): string[] {
  return fields.flatMap((field) => {
    const path = "name" in field && field.name
      ? `${prefix}${field.name}`
      : prefix;

    if ("fields" in field) {
      const nestedPrefix = "name" in field && field.name ? `${path}.` : prefix;
      return savedPaths(field.fields, nestedPrefix);
    }

    return "name" in field && field.name ? [path] : [];
  });
}

beforeEach(() => {
  editor.fields = {
    "actionCards.fundingTitle": { value: "Explore grants" },
    "actionCards.fundingDescription": { value: "Find the current calls." },
    "actionCards.eligibilityTitle": { value: "Check your business" },
    "actionCards.eligibilityDescription": { value: "Read the criteria." },
    "actionCards.trackingTitle": { value: "Follow your application" },
    "actionCards.trackingDescription": { value: "See your next steps." },
  };
});

describe("Home action cards editor", () => {
  it("exposes existing saved paths directly after the banner without revealing later sections", () => {
    expect(savedPaths(homePageActionCardsFields)).toEqual([
      "actionCards.fundingTitle",
      "actionCards.fundingDescription",
      "actionCards.eligibilityTitle",
      "actionCards.eligibilityDescription",
      "actionCards.trackingTitle",
      "actionCards.trackingDescription",
    ]);
    expect(Homepage.fields[1]).toBe(homePageActionCardsFields[0]);
    expect(Homepage.fields[1]).not.toHaveProperty("admin.hidden", true);
    expect(Homepage.fields[2]).toMatchObject({
      label: "Additional Home sections",
      admin: { hidden: true },
    });
    expect(savedPaths(Homepage.fields).filter((path) => path.startsWith("actionCards.")))
      .toEqual(savedPaths(homePageActionCardsFields));
  });

  it("uses current form text in the public cards with native read-only fields and an inert preview", () => {
    const html = renderToStaticMarkup(
      <CmsHomeActionsGroupField
        {...({ readOnly: true } as GroupFieldClientProps)}
      />,
    );

    for (const { value } of Object.values(editor.fields)) {
      expect(html).toContain(value);
    }
    expect(html).toContain('id="home-action-cards"');
    expect(html).toContain('href="/funding"');
    expect(html).toContain('href="/eligibility"');
    expect(html).toContain('href="/portal"');
    expect(html).toContain('data-read-only="true"');
    expect(html).toContain("inert");
  });

  it("reflects text edits and clears while using defaults for missing legacy values", () => {
    expect(useHomeActionsPreview().actionCards.fundingTitle).toBe("Explore grants");
    editor.fields["actionCards.fundingTitle"].value = "Updated title";
    expect(useHomeActionsPreview().actionCards.fundingTitle).toBe("Updated title");
    editor.fields["actionCards.fundingTitle"].value = "";
    expect(useHomeActionsPreview().actionCards.fundingTitle).toBe("");
    delete editor.fields["actionCards.fundingTitle"];
    expect(useHomeActionsPreview().actionCards.fundingTitle)
      .toBe(defaultHomeActionCards.fundingTitle);
  });
});
