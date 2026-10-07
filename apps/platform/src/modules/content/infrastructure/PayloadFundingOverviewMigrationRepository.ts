import "server-only";

import type { Payload, PayloadRequest } from "payload";
import type { Page } from "@/payload-types";
import { paragraphsToRichText } from "../ContentRichText";
import { eligibilityFocusSection } from "../EligibilityPageContent";
import { fundingPageSections } from "../FundingPageContent";
import { fundingOverviewSections, type FundingOverviewSlug } from "../FundingOverviewSections";

const migrationContext = { skipPublishCapability: true, skipRevalidation: true };

async function sourcePages(payload: Payload, req: PayloadRequest, draft: boolean) {
  return payload.find({
    collection: "pages",
    depth: 0,
    draft,
    limit: 5,
    pagination: false,
    overrideAccess: true,
    req,
    select: { slug: true, layout: true, reviewNotes: true },
    where: {
      and: [
        { slug: { in: ["funding", "eligibility", ...Object.keys(fundingOverviewSections)] } },
        ...(draft ? [] : [{ _status: { equals: "published" } }]),
      ],
    },
  });
}

async function sourceSectors(payload: Payload, req: PayloadRequest, draft: boolean) {
  // Paginate the legacy collection; each next page depends on the previous result.
  const sectors: { label: string; description: string }[] = [];
  let page = 1;
  while (true) {
    const result = await payload.find({
      collection: "eligibility-content",
      depth: 0,
      draft,
      limit: 100,
      page,
      overrideAccess: true,
      req,
      sort: ["order", "id"],
      select: { label: true, description: true },
      where: {
        and: [
          { kind: { equals: "focusSector" } },
          ...(draft ? [] : [{ _status: { equals: "published" } }]),
        ],
      },
    });
    sectors.push(...result.docs.map(({ label, description }) => ({ label, description })));
    if (!result.hasNextPage) return sectors;
    page += 1;
  }
}

function sectionLayout(
  slug: FundingOverviewSlug,
  pages: Pick<Page, "slug" | "layout">[],
  sectors: { label: string; description: string }[],
): NonNullable<Page["layout"]> {
  const funding = pages.find((page) => page.slug === "funding");
  const sections = fundingPageSections(funding?.layout ?? []);
  if (slug === "funding-support") {
    return [{
      blockType: "fundingSupport",
      ...sections.support,
      uses: sections.support.uses.map((label) => ({ label })),
    }];
  }
  if (slug === "funding-priority-applicants") {
    return [{ blockType: "fundingPriorities", ...sections.priorities }];
  }
  const eligibility = pages.find((page) => page.slug === "eligibility");
  return [{
    blockType: "eligibilityFocusSectors",
    ...eligibilityFocusSection(eligibility?.layout ?? []),
    sectors,
  }];
}

export async function migrateFundingOverviewDocuments(payload: Payload, req: PayloadRequest) {
  const [publishedPages, draftPages, publishedSectors, draftSectors] = await Promise.all([
    sourcePages(payload, req, false),
    sourcePages(payload, req, true),
    sourceSectors(payload, req, false),
    sourceSectors(payload, req, true),
  ]);
  // An empty installation is initialized by the explicit baseline seed. Creating
  // these records first would make its collection-history guard skip other Pages.
  if (
    draftPages.docs.length === 0 && publishedPages.docs.length === 0 &&
    draftSectors.length === 0 && publishedSectors.length === 0
  ) {
    return;
  }
  // Ordered writes share the migration transaction. A failed write rolls it back.
  for (const slug of Object.keys(fundingOverviewSections) as FundingOverviewSlug[]) {
    if (draftPages.docs.some((page) => page.slug === slug)) continue;
    const section = fundingOverviewSections[slug];
    const publishedLayout = sectionLayout(slug, publishedPages.docs, publishedSectors);
    const draftLayout = sectionLayout(slug, draftPages.docs, draftSectors);
    const live = await payload.create({
      collection: "pages",
      overrideAccess: true,
      req,
      context: migrationContext,
      data: {
        slug,
        title: section.title,
        content: paragraphsToRichText([section.title]),
        layout: publishedLayout,
        reviewStatus: "approved",
        _status: "published",
      },
    });
    if (JSON.stringify(publishedLayout) !== JSON.stringify(draftLayout)) {
      const sourceSlug = slug === "funding-focus-sectors" ? "eligibility" : "funding";
      const source = draftPages.docs.find((page) => page.slug === sourceSlug);
      await payload.update({
        collection: "pages",
        id: live.id,
        draft: true,
        overrideAccess: true,
        req,
        context: migrationContext,
        data: {
          layout: draftLayout,
          reviewNotes: source?.reviewNotes,
          reviewStatus: "draft",
          _status: "draft",
        },
      });
    }
  }
}
