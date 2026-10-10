import { renderToStaticMarkup } from "react-dom/server";
import type { Field, FormState, GroupField } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({ fields: {} as FormState }));
vi.mock("@payloadcms/ui", () => ({
  useFormFields: (selector: (args: [FormState]) => unknown) =>
    selector([editor.fields]),
}));

import { useHomeListPreview } from "@/modules/content/ui/admin/useHomeListPreview";
import {
  homeProcessContent,
  homeSupportContent,
} from "@/modules/content/HomeListContent";
import { HomeProcess } from "@/modules/content/ui/public/HomeProcess";
import { HomeSupport } from "@/modules/content/ui/public/HomeSupport";
import {
  homePageProcessFields,
  homePageSupportFields,
  homePageAdditionalFields,
} from "@/payload/fields/HomePageListsFields";
import {
  homeEditorFields,
  homeEditorFormState,
} from "@/modules/content/ui/admin/HomeEditorSections";
import type { ClientField } from "payload";
import { getFieldPaths } from "payload/shared";
import { Homepage } from "@/payload/globals/Homepage";

function childFields(fields: Field[]) {
  return (fields[0] as GroupField).fields;
}

beforeEach(() => {
  editor.fields = {
    "process.heading": { value: "Your next steps", valid: true },
    "process.introduction": { value: "Start here", valid: true },
    "process.steps": { value: 2, valid: true, disableFormData: true },
    "process.steps.0.title": { value: "Second step moved first", valid: true },
    "process.steps.0.description": { value: "First description", valid: true },
    "process.steps.1.title": { value: "First step moved second", valid: true },
    "process.steps.1.description": { value: "Second description", valid: true },
    supportHeading: { value: "Who can grow", valid: true },
    supportIntroduction: { value: "Businesses we support", valid: true },
    supportCards: { value: 1, valid: true, disableFormData: true },
    "supportCards.0.label": { value: "New support group", valid: true },
    "supportCards.0.description": {
      value: "New support description",
      valid: true,
    },
    title: { value: "Unrelated banner", valid: true },
    reviewStatus: { value: "draft", valid: true },
  } as FormState;
});

describe("editable Home card lists", () => {
  it("does not require exactly four steps or restrict card additions/removals", () => {
    const steps = childFields(homePageProcessFields).find(
      (field) => "name" in field && field.name === "steps",
    );
    const cards = childFields(homePageSupportFields).find(
      (field) => "name" in field && field.name === "supportCards",
    );
    for (const field of [steps, cards]) {
      expect(field?.type).toBe("array");
      expect(field).not.toHaveProperty("minRows");
      expect(field).not.toHaveProperty("maxRows");
      expect(field).not.toHaveProperty("required", true);
      expect(field?.admin?.components?.Field).toContain("CmsCardListField");
      if (field && "fields" in field) {
        expect(field.fields[0].admin?.components?.Field).toContain(
          "CmsFormInput",
        );
        expect(field.fields[1].admin?.components?.Field).toContain(
          "CmsFormTextarea",
        );
      }
    }
  });

  it("previews the current native row order, descriptions and headings", () => {
    const preview = useHomeListPreview();
    expect(preview.process.heading).toBe("Your next steps");
    expect(preview.process.steps.map((step) => step.title)).toEqual([
      "Second step moved first",
      "First step moved second",
    ]);
    expect(preview.supportCards).toMatchObject([
      { label: "New support group", description: "New support description" },
    ]);
  });

  it("reflects additions and allows clearing every row without restoring defaults", () => {
    editor.fields["process.steps"].value = 3;
    editor.fields["process.steps.2.title"] = {
      value: "Added step",
      valid: true,
    };
    editor.fields["process.steps.2.description"] = {
      value: "Added description",
      valid: true,
    };
    expect(useHomeListPreview().process.steps).toHaveLength(3);
    for (const path of Object.keys(editor.fields)) {
      if (
        path.startsWith("process.steps.") ||
        path.startsWith("supportCards.")
      ) {
        delete editor.fields[path];
      }
    }
    editor.fields["process.steps"].value = 0;
    editor.fields.supportCards.value = 0;
    expect(useHomeListPreview().process.steps).toEqual([]);
    expect(useHomeListPreview().supportCards).toEqual([]);
    expect(homeProcessContent({ steps: [] }).steps).toEqual([]);
    expect(homeSupportContent({ supportCards: [] }).supportCards).toEqual([]);
  });

  it("isolates each new section's values and keeps array rows in the selected form", () => {
    const process = homeEditorFormState(editor.fields, "how-it-works");
    const support = homeEditorFormState(editor.fields, "who-we-support");
    expect(process["process.steps.1.title"].value).toBe(
      "First step moved second",
    );
    expect(process).not.toHaveProperty("supportHeading");
    expect(support["supportCards.0.label"].value).toBe("New support group");
    expect(support).not.toHaveProperty("process.steps.0.title");
    expect(support).not.toHaveProperty("title");
    const scoped = homeEditorFields(
      homePageAdditionalFields as ClientField[],
      "additional-content",
    );
    expect(scoped).toHaveLength(1);
    expect(
      childFields(scoped as Field[]).map(
        (field) => "name" in field && field.name,
      ),
    ).toEqual(["fundingSlogan", "newsIntroduction", "layout"]);
    const additionalFields = childFields(scoped as Field[]);
    expect(additionalFields[0]).toMatchObject({ admin: { hidden: true } });
    expect(additionalFields[1]).toMatchObject({ admin: { hidden: true } });
    expect(additionalFields[2]).not.toMatchObject({ admin: { hidden: true } });
    expect(additionalFields[2].admin?.components?.Field).toContain(
      "CmsHomeImpactField",
    );
  });

  it("preserves native unnamed-group paths so support and additional editors cannot render the banner", () => {
    for (const section of ["who-we-support", "additional-content"] as const) {
      const original = Homepage.fields as ClientField[];
      const scoped = homeEditorFields(original, section);
      expect(scoped).toHaveLength(original.length);
      const visibleGroup = scoped.findIndex(
        (field) => field.type === "group" && !field.admin?.hidden,
      );
      expect(visibleGroup).toBeGreaterThan(0);
      const args = {
        index: visibleGroup,
        parentIndexPath: "",
        parentPath: "",
        parentSchemaPath: "homepage",
      };
      expect(getFieldPaths({ ...args, field: scoped[visibleGroup] })).toEqual(
        getFieldPaths({ ...args, field: original[visibleGroup] }),
      );
      expect(scoped[0].admin?.hidden).toBe(true);
      expect(original[0].admin?.hidden).not.toBe(true);
    }
  });

  it.each([0, 1, 2, 3, 5, 8])("renders exactly %i process cards", (count) => {
    const process = homeProcessContent({
      steps: Array.from({ length: count }, (_, index) => ({
        title: `Step ${index}`,
        description: `Description ${index}`,
      })),
    });
    const html = renderToStaticMarkup(<HomeProcess content={{ process }} />);
    expect(html.match(/<h3\b/g) ?? []).toHaveLength(count);
    const connectors = count === 0 ? 0 : count - Math.ceil(count / 4);
    expect(html.match(/border-dotted/g) ?? []).toHaveLength(connectors);
  });

  it("renders saved support cards once in the CMS grid, preserving repeated entries", () => {
    const content = homeSupportContent({
      supportCards: [
        { label: "Repeated title", description: "First saved card" },
        { label: "Repeated title", description: "Second saved card" },
        { label: "Another card", description: "Third saved card" },
      ],
    });
    const html = renderToStaticMarkup(
      <HomeSupport content={content} presentation="grid" />,
    );
    expect(html.match(/<article\b/g)).toHaveLength(3);
    expect(html.match(/Repeated title/g)).toHaveLength(2);
    expect(html).toContain("md:grid-cols-2 xl:grid-cols-3");
    expect(html).not.toContain("support-marquee");
    expect(html).not.toContain("support-track");
    expect(html).not.toContain("support-card");
    expect(html).not.toContain('<div aria-hidden="true"');
  });

  it("renders only the saved support list and its hidden animation copy", () => {
    const content = homeSupportContent({
      supportCards: [
        { label: "User's card", description: "User's description" },
      ],
    });
    const html = renderToStaticMarkup(<HomeSupport content={content} />);
    expect(html.match(/<article\b/g)).toHaveLength(2);
    expect(html).toContain(`aria-label="${content.supportHeading}"`);
    expect(html).toContain('role="region" tabindex="0"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("Youth-owned businesses");
    const empty = renderToStaticMarkup(
      <HomeSupport content={{ ...content, supportCards: [] }} />,
    );
    expect(empty).not.toContain("<article");
  });
});
