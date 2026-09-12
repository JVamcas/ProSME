import { fileURLToPath } from "node:url";
import type { Payload } from "payload";

import { findId, seedContext } from "./seed-helpers";

const impactImageAlt = "Namibian mountain landscape";

async function seedImpactImage(payload: Payload) {
  const current = await findId(payload, "media", "alt", impactImageAlt);

  if (current) {
    return current;
  }

  const created = await payload.create({
    collection: "media",
    context: seedContext,
    data: { alt: impactImageAlt },
    filePath: fileURLToPath(new URL("../../../public/brand/pic5.png", import.meta.url)),
    overrideAccess: true,
  });

  return created.id;
}

export async function seedSiteGlobals(payload: Payload) {
  const impactImageId = await seedImpactImage(payload);
  await Promise.all([
    payload.updateGlobal({
      slug: "homepage",
      context: seedContext,
      overrideAccess: true,
      data: {
        applyHref: "/portal/applications/new",
        applyLabel: "Apply Now",
        eligibilityLabel: "Check My Eligibility",
        eyebrow: "Funding today. A stronger tomorrow.",
        heroPanelHeading: "Bigger businesses. A brighter Namibia.",
        heroPanelSummary: "Open to eligible MSMEs from all 14 regions and every sector.",
        layout: [
          { blockType: "resourceGrid", heading: "Latest News & Resources", limit: 4 },
          { blockType: "statistics", backgroundImage: impactImageId, heading: "Real businesses, lasting impact.", summary: "Together, we’re building a more competitive Namibia that supports MSME growth." },
        ],
        newsHeading: "Latest News & Resources",
        reviewStatus: "approved",
        summary: "Funding and business development support for Namibian MSMEs ready to grow.",
        title: "Your business has potential. We help you take the next step.",
        trackingLabel: "Track Application",
        _status: "published",
      },
    }),
    payload.updateGlobal({
      slug: "header",
      context: seedContext,
      overrideAccess: true,
      data: {
        announcement: "An initiative under the ProSME Project",
        applyHref: "/portal/applications/new",
        applyLabel: "Apply Now",
        reviewStatus: "approved",
        signInLabel: "Sign in",
        _status: "published",
      },
    }),
    payload.updateGlobal({
      slug: "footer",
      context: seedContext,
      overrideAccess: true,
      data: {
        copyright: "© 2026 SME Fund Namibia. All rights reserved.",
        newsletterHeading: "Stay in the loop",
        newsletterSummary: "Get funding-call updates and approved business resources.",
        reviewStatus: "approved",
        summary: "Supporting Namibian MSMEs to grow, compete and create opportunities.",
        tagline: "Funding today. A stronger tomorrow.",
        _status: "published",
      },
    }),
    payload.updateGlobal({
      slug: "contact-details",
      context: seedContext,
      overrideAccess: true,
      data: {
        address: "Namibia Investment Promotion and Development Board, Windhoek, Namibia",
        email: "info@smefund.na",
        officeHours: "Monday to Friday, 08:00–17:00",
        reviewStatus: "approved",
        _status: "published",
      },
    }),
    payload.updateGlobal({
      slug: "site-settings",
      context: seedContext,
      overrideAccess: true,
      data: {
        allowIndexing: true,
        reviewStatus: "approved",
        siteDescription: "Funding and business development support for Namibian MSMEs.",
        siteName: "SME Fund Namibia",
        _status: "published",
      },
    }),
  ]);
}
