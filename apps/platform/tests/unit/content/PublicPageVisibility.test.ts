import { describe, expect, it } from "vitest";
import {
  isPublicPageVisible,
  isPublicPathVisible,
  publicPageVisibilitySchema,
} from "@/modules/content/domain/PublicPageVisibility";
import { visibleKnowledgeSelection } from "@/modules/chatbot/domain/PublicKnowledgeVisibility";

describe("public page visibility", () => {
  it("keeps existing pages enabled and Home permanently visible", () => {
    expect(isPublicPageVisible({}, "home")).toBe(true);
    expect(isPublicPageVisible({}, "funding.overview.sectors")).toBe(true);
    expect(isPublicPageVisible({ home: false }, "home")).toBe(true);
    expect(isPublicPageVisible({}, "unknown")).toBe(false);
  });

  it("hides all descendants of a hidden parent and retains their settings", () => {
    const visibility = {
      funding: false,
      "funding.overview": true,
      "funding.overview.support": true,
      "funding.overview.priorities": false,
    };
    expect(isPublicPageVisible(visibility, "funding.overview")).toBe(false);
    expect(isPublicPageVisible(visibility, "funding.overview.support")).toBe(
      false,
    );
    expect(isPublicPageVisible(visibility, "funding.application-guide")).toBe(
      false,
    );
    visibility.funding = true;
    expect(isPublicPageVisible(visibility, "funding.overview.support")).toBe(
      true,
    );
    expect(isPublicPageVisible(visibility, "funding.overview.priorities")).toBe(
      false,
    );
  });

  it("supports independent grandchildren and prevents an ancestor override", () => {
    const visibility = {
      "funding.overview": false,
      "funding.overview.sectors": true,
    };
    expect(isPublicPageVisible(visibility, "funding.overview.sectors")).toBe(
      false,
    );
    expect(isPublicPageVisible(visibility, "funding.application-guide")).toBe(
      true,
    );
  });

  it("matches public routes, descendants, aliases and query strings precisely", () => {
    expect(isPublicPathVisible({ news: false }, "/news/42?x=1")).toBe(false);
    expect(isPublicPathVisible({ news: false }, "/newsletter")).toBe(true);
    expect(isPublicPathVisible({ funding: false }, "/how-to-apply")).toBe(
      false,
    );
    expect(
      isPublicPathVisible(
        { "funding.application-guide": false },
        "/how-to-apply/funding/42",
      ),
    ).toBe(true);
    expect(
      isPublicPathVisible({ funding: false }, "/eligibility"),
    ).toBe(false);
    expect(
      isPublicPathVisible(
        { funding: false },
        "/how-to-apply/eligibility",
      ),
    ).toBe(false);
    expect(
      isPublicPathVisible({ funding: false }, "/portal/applications"),
    ).toBe(true);
  });

  it("rejects unknown keys, non-boolean values and hiding Home", () => {
    expect(
      publicPageVisibilitySchema.safeParse({ "home.banner": false }).success,
    ).toBe(true);
    expect(publicPageVisibilitySchema.safeParse({ other: false }).success).toBe(
      false,
    );
    expect(publicPageVisibilitySchema.safeParse({ news: "off" }).success).toBe(
      false,
    );
    expect(publicPageVisibilitySchema.safeParse({ home: false }).success).toBe(
      false,
    );
  });

  it("excludes hidden public knowledge while keeping independent document selections", () => {
    const selection = {
      fundingCallIds: ["call"],
      eligibilityCallIds: ["call"],
      faqIds: ["faq"],
      contact: true,
      documentIds: ["document"],
    };
    expect(
      visibleKnowledgeSelection(selection, {
        funding: false,
        faq: false,
        contact: false,
      }),
    ).toEqual({
      fundingCallIds: [],
      eligibilityCallIds: [],
      faqIds: [],
      contact: false,
      documentIds: ["document"],
    });
    expect(selection.fundingCallIds).toEqual(["call"]);
  });
});
