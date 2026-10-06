import { describe, expect, it } from "vitest";
import type { ClientField, FormState } from "payload";
import { homePageBannerFields } from "@/payload/fields/HomePageBannerFields";
import { homePageActionCardsFields } from "@/payload/fields/HomePageActionCardsFields";
import {
  homeEditorFields,
  homeEditorFormState,
  homeEditorSectionForPath,
  homeEditorSelect,
} from "@/modules/content/ui/admin/HomeEditorSections";

const fields = [
  ...homePageBannerFields,
  ...homePageActionCardsFields,
  { name: "reviewStatus", type: "select", options: ["draft"] },
  { name: "reviewNotes", type: "textarea" },
  { name: "_status", type: "select", options: ["draft", "published"] },
] as ClientField[];

function storedNames(fields: ClientField[]): string[] {
  return fields.flatMap((field) => {
    if (field.admin?.hidden) return [];
    if ("name" in field && field.name) return [field.name];
    return "fields" in field ? storedNames(field.fields) : [];
  });
}

const state = {
  title: { value: "Banner headline", valid: true },
  heroImage: { value: 165, valid: true },
  "actionCards.fundingTitle": { value: "Funding card", valid: true },
  "actionCards.trackingDescription": { value: "Track progress", valid: true },
  reviewStatus: { value: "draft", valid: true },
  _status: { value: "draft", valid: true },
  applyHref: { value: "/portal/applications/new", valid: true },
  reviewNotes: { value: "Stored notes", valid: true },
  presentation: { disableFormData: true },
} as FormState;

describe("separate homepage section editors", () => {
  it("maps the canonical section paths", () => {
    expect(homeEditorSectionForPath("/cms/home/banner")).toBe("banner");
    expect(homeEditorSectionForPath("/cms/home/action-cards")).toBe(
      "action-cards",
    );
    expect(homeEditorSectionForPath("/cms/home/how-it-works")).toBe("how-it-works");
    expect(homeEditorSectionForPath("/cms/home/who-we-support")).toBe("who-we-support");
    expect(homeEditorSectionForPath("/cms/home/additional-content")).toBe("additional-content");
    expect(homeEditorSectionForPath("/cms/home")).toBeUndefined();
    expect(homeEditorSectionForPath("/cms/globals/homepage")).toBeUndefined();
    expect(homeEditorSectionForPath("/cms/home/banner/extra")).toBeUndefined();
  });

  it("keeps overview and banner together while excluding other editable sections", () => {
    const scoped = homeEditorFields(fields, "banner");
    const names = storedNames(scoped);
    expect(names).toEqual(Object.keys(homeEditorSelect("banner")));
    expect(scoped[0]).toMatchObject({
      type: "group",
      label: "Home Page Banner",
    });
    expect(names).not.toContain("actionCards");
    expect(names).not.toContain("reviewNotes");
    expect(names).not.toContain("reviewStatus");
    expect(storedNames(fields)).toContain("actionCards");
  });

  it("includes all six action fields in the existing named group", () => {
    const scoped = homeEditorFields(fields, "action-cards");
    expect(storedNames(scoped)).toEqual([
      "actionCards",
      "_status",
    ]);
    expect(scoped[1]).toBe(fields[1]);
    const cardFields =
      "fields" in scoped[1] ? storedNames(scoped[1].fields) : [];
    expect(cardFields).toEqual([
      "fundingTitle",
      "fundingDescription",
      "eligibilityTitle",
      "eligibilityDescription",
      "trackingTitle",
      "trackingDescription",
    ]);
  });

  it("submits only banner values and native publishing state from the banner form", () => {
    expect(Object.keys(homeEditorFormState(state, "banner"))).toEqual([
      "title",
      "heroImage",
      "_status",
      "presentation",
    ]);
    expect(state["actionCards.fundingTitle"].value).toBe("Funding card");
  });

  it("submits only nested action card values and publishing state from its form", () => {
    expect(Object.keys(homeEditorFormState(state, "action-cards"))).toEqual([
      "actionCards.fundingTitle",
      "actionCards.trackingDescription",
      "_status",
      "presentation",
    ]);
    expect(state.title.value).toBe("Banner headline");
  });
});
