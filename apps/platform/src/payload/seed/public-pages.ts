import { approvedPageParagraphs, defaultPages, focusSectors } from "../../modules/content/ContentDefaults";
import { defaultFocusSectorBlocks, defaultFundingOverviewBlocks } from "../../modules/content/FundingOverviewDefaults";
import {
  fundingOverviewDefaultBlocks,
  fundingOverviewSections,
  type FundingOverviewSlug,
} from "../../modules/content/FundingOverviewSections";

export const publicPages = [
  ...(Object.keys(fundingOverviewSections) as FundingOverviewSlug[]).map((slug) => {
    const section = fundingOverviewSections[slug];
    const layout = fundingOverviewDefaultBlocks(slug);
    return {
      slug,
      title: section.title,
      summary: "",
      paragraphs: [section.title],
      layout: slug === "funding-focus-sectors"
        ? [{
            ...defaultFocusSectorBlocks[0],
            sectors: focusSectors.map((label) => ({ label, description: "Priority area" })),
          }]
        : layout,
    };
  }),
  { slug: "about", ...defaultPages.about, paragraphs: approvedPageParagraphs.about },
  {
    slug: "funding",
    ...defaultPages.funding,
    paragraphs: approvedPageParagraphs.funding,
    layout: defaultFundingOverviewBlocks,
  },
  {
    slug: "eligibility",
    ...defaultPages.eligibility,
    paragraphs: approvedPageParagraphs.eligibility,
    layout: defaultFocusSectorBlocks,
  },
  {
    slug: "how-to-apply",
    ...defaultPages["how-to-apply"],
    paragraphs: approvedPageParagraphs["how-to-apply"],
  },
  { slug: "news", title: "Latest news", summary: "Official announcements and programme updates from the SME Fund.", paragraphs: ["Published programme updates appear below."] },
  { slug: "resources", title: "Guides and documents", summary: "Approved programme information to help your MSME prepare and apply.", paragraphs: ["Published guides and programme documents appear below."] },
  { slug: "events", title: "Events & Programmes", summary: "Official briefings, workshops and enterprise-development events.", paragraphs: ["Published programme events appear below."] },
  {
    slug: "faq",
    ...defaultPages.faq,
    paragraphs: approvedPageParagraphs.faq,
  },
  { slug: "contact", title: "Contact the SME Fund", summary: "Send the team a question about programme information, eligibility or application support.", paragraphs: ["Use the contact form for programme and application enquiries. The team will respond using the contact details you provide."] },
  { slug: "privacy", ...defaultPages.privacy, paragraphs: approvedPageParagraphs.privacy },
  { slug: "terms", ...defaultPages.terms, paragraphs: approvedPageParagraphs.terms },
];
