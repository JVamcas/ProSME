import { getPayload, type CollectionSlug, type SanitizedConfig } from "payload";
import { fileURLToPath } from "node:url";

import {
  approvedFaqFallback,
  defaultStatistics,
  defaultSupportGroups,
  focusSectors,
} from "../../modules/content/content.defaults";
import { eligibilityRules } from "../../data/eligibility-rules";
import type { Faq, FundingCall, Page } from "../../payload-types";
import { primaryNavigation, publicPages } from "./public-pages";

export async function script(config: SanitizedConfig) {
  const payload = await getPayload({ config });
  const context = { skipPublishCapability: true, skipRevalidation: true };
  type SeedRichText = Page["content"] &
    Faq["answer"] &
    FundingCall["eligibility"];

  function richText(paragraphs: readonly string[]): SeedRichText {
    return {
      root: {
        type: "root",
        children: paragraphs.map((text) => ({
          type: "paragraph",
          children: [{ type: "text", text, version: 1 }],
          direction: null,
          format: "",
          indent: 0,
          version: 1,
          textFormat: 0,
          textStyle: "",
        })),
        direction: null,
        format: "",
        indent: 0,
        version: 1,
      },
    } as SeedRichText;
  }

  async function findId(
    collection: CollectionSlug,
    field: string,
    value: string | number,
  ) {
    const result = await payload.find({
      collection,
      limit: 1,
      overrideAccess: true,
      where: { [field]: { equals: value } },
    });
    return result.docs[0]?.id;
  }

  async function seedPages() {
    for (const page of publicPages) {
      const current = await findId("pages", "slug", page.slug);
      const data = {
        title: page.title,
        summary: page.summary,
        content: richText(page.paragraphs),
        ...("layout" in page ? { layout: page.layout } : {}),
        reviewStatus: "approved" as const,
        _status: "published" as const,
      };
      if (current)
        await payload.update({
          collection: "pages",
          id: current,
          data,
          context,
          overrideAccess: true,
        });
      else
        await payload.create({
          collection: "pages",
          data: { ...data, slug: page.slug },
          context,
          overrideAccess: true,
        });
    }
  }

  async function seedFaqs() {
    for (const [order, [question, answer]] of approvedFaqFallback.entries()) {
      const current = await findId("faqs", "question", question);
      const data = {
        answer: richText([answer]),
        category: "General",
        order,
        question,
        reviewStatus: "approved" as const,
        _status: "published" as const,
      };
      if (current)
        await payload.update({
          collection: "faqs",
          id: current,
          data,
          context,
          overrideAccess: true,
        });
      else
        await payload.create({
          collection: "faqs",
          data,
          context,
          overrideAccess: true,
        });
    }
  }

  async function seedProgrammeContent() {
    for (const [order, item] of defaultStatistics.entries()) {
      const current = await findId("programme-statistics", "order", order);
      const data = {
        ...item,
        order,
        reviewStatus: "approved" as const,
        _status: "published" as const,
      };
      if (current)
        await payload.update({
          collection: "programme-statistics",
          id: current,
          data,
          context,
          overrideAccess: true,
        });
      else
        await payload.create({
          collection: "programme-statistics",
          data,
          context,
          overrideAccess: true,
        });
    }
    for (const [order, item] of defaultSupportGroups.entries()) {
      const current = await findId("eligibility-content", "label", item.label);
      const data = {
        ...item,
        kind: "criterion" as const,
        order,
        reviewStatus: "approved" as const,
        _status: "published" as const,
      };
      if (current)
        await payload.update({
          collection: "eligibility-content",
          id: current,
          data,
          context,
          overrideAccess: true,
        });
      else
        await payload.create({
          collection: "eligibility-content",
          data,
          context,
          overrideAccess: true,
        });
    }
    for (const [order, label] of focusSectors.entries()) {
      const current = await findId("eligibility-content", "label", label);
      const data = {
        description: "Priority area",
        kind: "focusSector" as const,
        label,
        order,
        reviewStatus: "approved" as const,
        _status: "published" as const,
      };
      if (current)
        await payload.update({
          collection: "eligibility-content",
          id: current,
          data,
          context,
          overrideAccess: true,
        });
      else
        await payload.create({
          collection: "eligibility-content",
          data,
          context,
          overrideAccess: true,
        });
    }
    for (const [order, rule] of eligibilityRules.entries()) {
      const current = await findId("eligibility-content", "key", rule.id);
      const data = {
        description: rule.help,
        hardStop: rule.hardStop,
        key: rule.id,
        kind: "checkerQuestion" as const,
        label: rule.question,
        order: order + 100,
        reviewStatus: "approved" as const,
        _status: "published" as const,
      };
      if (current)
        await payload.update({
          collection: "eligibility-content",
          id: current,
          data,
          context,
          overrideAccess: true,
        });
      else
        await payload.create({
          collection: "eligibility-content",
          data,
          context,
          overrideAccess: true,
        });
    }
  }

  async function seedResourceAndCall() {
    const resourceSlug = "first-call-funding-criteria";
    const resourceId = await findId("resources", "slug", resourceSlug);
    const resource = {
      category: "Application guide",
      description:
        "Approved application criteria and supporting-document requirements for the SME Fund’s first call.",
      externalUrl: "/documents/sme-fund-first-call-funding-criteria.pdf",
      publishedAt: "2026-06-10T00:00:00.000Z",
      reviewStatus: "approved" as const,
      slug: resourceSlug,
      title: "First Call funding criteria",
      _status: "published" as const,
    };
    if (resourceId)
      await payload.update({
        collection: "resources",
        id: resourceId,
        data: resource,
        context,
        overrideAccess: true,
      });
    else
      await payload.create({
        collection: "resources",
        data: resource,
        context,
        overrideAccess: true,
      });

    const callSlug = "first-call-for-applications";
    const callId = await findId("funding-calls", "slug", callSlug);
    const call = {
      applicationUrl: null,
      callStatus: "closed" as const,
      closesAt: "2026-07-24T21:59:59.000Z",
      eligibility: richText([
        "The first call for applications closed on 24 July 2026.",
        "Applicants were required to be at least 51% Namibian-owned, compliant with relevant statutory institutions, registered on the NIPDB MSME database and operating for at least one year.",
      ]),
      maximumAmount: 100000,
      minimumAmount: 50000,
      opensAt: "2026-06-10T00:00:00.000Z",
      reviewStatus: "approved" as const,
      slug: callSlug,
      summary:
        "The first SME Fund call is closed. Its published criteria remain available for reference.",
      title: "First Call for Applications",
      _status: "published" as const,
    };
    if (callId)
      await payload.update({
        collection: "funding-calls",
        id: callId,
        data: call,
        context,
        overrideAccess: true,
      });
    else
      await payload.create({
        collection: "funding-calls",
        data: call,
        context,
        overrideAccess: true,
      });
  }

  async function seedImpactImage() {
    const current = await findId("media", "filename", "pic5.png");
    if (current) return current;
    const created = await payload.create({
      collection: "media",
      context,
      data: { alt: "Namibian mountain landscape" },
      filePath: fileURLToPath(
        new URL("../../../public/brand/pic5.png", import.meta.url),
      ),
      overrideAccess: true,
    });
    return created.id;
  }

  const impactImageId = await seedImpactImage();
  await Promise.all([
    payload.updateGlobal({
      slug: "homepage",
      context,
      overrideAccess: true,
      data: {
        applyHref: "/portal/applications/new",
        applyLabel: "Apply Now",
        eligibilityLabel: "Check My Eligibility",
        eyebrow: "Funding today. A stronger tomorrow.",
        heroPanelHeading: "Bigger businesses. A brighter Namibia.",
        heroPanelSummary:
          "Open to eligible MSMEs from all 14 regions and every sector.",
        layout: [
          {
            blockType: "resourceGrid",
            heading: "Latest News & Resources",
            limit: 4,
          },
          {
            blockType: "statistics",
            backgroundImage: impactImageId,
            heading: "Real businesses, lasting impact.",
            summary:
              "Together, we’re building a more competitive Namibia that supports MSME growth.",
          },
        ],
        newsHeading: "Latest News & Resources",
        reviewStatus: "approved",
        summary:
          "Funding and business development support for Namibian MSMEs ready to grow.",
        title: "Your business has potential. We help you take the next step.",
        trackingLabel: "Track Application",
        _status: "published",
      },
    }),
    payload.updateGlobal({
      slug: "header",
      context,
      overrideAccess: true,
      data: {
        announcement: "An initiative under the ProSME Project",
        applyHref: "/portal/applications/new",
        applyLabel: "Apply Now",
        navigation: primaryNavigation.map(([href, label]) => ({ href, label })),
        reviewStatus: "approved",
        signInLabel: "Sign in",
        _status: "published",
      },
    }),
    payload.updateGlobal({
      slug: "footer",
      context,
      overrideAccess: true,
      data: {
        copyright: "© 2026 SME Fund Namibia. All rights reserved.",
        newsletterHeading: "Stay in the loop",
        newsletterSummary:
          "Get funding-call updates and approved business resources.",
        reviewStatus: "approved",
        summary:
          "Supporting Namibian MSMEs to grow, compete and create opportunities.",
        tagline: "Funding today. A stronger tomorrow.",
        _status: "published",
      },
    }),
    payload.updateGlobal({
      slug: "contact-details",
      context,
      overrideAccess: true,
      data: {
        address:
          "Namibia Investment Promotion and Development Board, Windhoek, Namibia",
        email: "info@smefund.na",
        officeHours: "Monday to Friday, 08:00–17:00",
        reviewStatus: "approved",
        _status: "published",
      },
    }),
    payload.updateGlobal({
      slug: "site-settings",
      context,
      overrideAccess: true,
      data: {
        allowIndexing: true,
        reviewStatus: "approved",
        siteDescription:
          "Funding and business development support for Namibian MSMEs.",
        siteName: "SME Fund Namibia",
        _status: "published",
      },
    }),
  ]);
  await Promise.all([
    seedPages(),
    seedFaqs(),
    seedProgrammeContent(),
    seedResourceAndCall(),
  ]);
  payload.logger.info("Phase 2 approved public content seeded successfully");
}
