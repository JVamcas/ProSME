import { fileURLToPath } from "node:url";
import type { Payload, PayloadRequest } from "payload";

import { findId, seedContext, seedGlobalIfMissing } from "./seed-helpers";
import { hasSavedGlobal } from "@/modules/content/infrastructure/CmsSeedStateRepository";
import {
  defaultHomeActionCards,
  defaultHomeProcess,
  defaultSupportGroups,
} from "@/modules/content/ContentDefaults";

const impactImageAlt = "Namibian mountain landscape";

async function seedImpactImage(payload: Payload, req?: PayloadRequest) {
  const current = await findId(payload, "media", "alt", impactImageAlt, req);

  if (current) {
    return current;
  }

  const created = await payload.create({
    collection: "media",
    context: seedContext,
    req,
    data: { alt: impactImageAlt },
    filePath: fileURLToPath(
      new URL("../../../public/brand/pic5.png", import.meta.url),
    ),
    overrideAccess: true,
  });

  return created.id;
}

async function seedHomepage(payload: Payload, req?: PayloadRequest) {
  if (await hasSavedGlobal(payload, "homepage", req)) return;

  const impactImageId = await seedImpactImage(payload, req);
  await payload.updateGlobal({
    slug: "homepage",
    context: seedContext,
    req,
    overrideAccess: true,
    data: {
      actionCards: defaultHomeActionCards,
      process: defaultHomeProcess,
      fundingButtonLabel: "Funding Opportunities",
      benefitFunding: "Access funding",
      benefitCapacity: "Build your capacity",
      benefitOpportunity: "Create opportunities",
      supportCards: defaultSupportGroups,
      supportHeading: "Who we support",
      supportIntroduction:
        "The SME Fund is open to any Namibian MSME with high potential, inclusive impact and a commitment to growth. Our priority areas include:",
      newsIntroduction:
        "Updates, stories and useful materials for Namibian entrepreneurs.",
      fundingSlogan: "Brighter businesses. A stronger Namibia.",
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
          campaignMessage: "Small Businesses. A Brighter Namibia",
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
  });
}

export async function seedSiteGlobals(payload: Payload, req?: PayloadRequest) {
  // Payload rolls back the shared request on an operation error. Order writes
  // so no other operation can continue after that rollback.
  await seedHomepage(payload, req);
  await seedGlobalIfMissing(payload, {
    slug: "header",
    context: seedContext,
    req,
    overrideAccess: true,
    data: {
      announcement: "An initiative under the SME Fund Project",
      applyHref: "/portal/applications/new",
      applyLabel: "Apply Now",
      reviewStatus: "approved",
      signInLabel: "Sign in",
      _status: "published",
    },
  });
  await seedGlobalIfMissing(payload, {
    slug: "footer",
    context: seedContext,
    req,
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
  });
  await seedGlobalIfMissing(payload, {
    slug: "contact-details",
    context: seedContext,
    req,
    overrideAccess: true,
    data: {
      address:
        "Namibia Investment Promotion and Development Board, Windhoek, Namibia",
      email: "info@smefund.na",
      officeHours: "Monday to Friday, 08:00–17:00",
      reviewStatus: "approved",
      _status: "published",
    },
  });
  await seedGlobalIfMissing(payload, {
    slug: "site-settings",
    context: seedContext,
    req,
    overrideAccess: true,
    data: {
      allowIndexing: true,
      reviewStatus: "approved",
      siteDescription:
        "Funding and business development support for Namibian MSMEs.",
      siteName: "SME Fund Namibia",
      _status: "published",
    },
  });
}
