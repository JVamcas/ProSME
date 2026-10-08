import type { HomepageContent } from "@/modules/content/ContentTypes";
import {
  defaultHomeActionCards,
  defaultHomeProcess,
  defaultSupportGroups,
} from "@/modules/content/ContentDefaults";

export const homepageFixture: HomepageContent = {
  actionCards: defaultHomeActionCards,
  applyHref: "/portal/applications/new",
  applyLabel: "Apply Now",
  blocks: [],
  eligibilityLabel: "Check My Eligibility",
  eyebrow: "Funding today. A stronger tomorrow.",
  heroPanelHeading: "Bigger businesses. A brighter Namibia.",
  heroPanelSummary:
    "Open to eligible MSMEs from all 14 regions and every sector.",
  fundingButtonLabel: "Funding Opportunities",
  fundingSlogan: "Brighter businesses. A stronger Namibia.",
  benefitFunding: "Access funding",
  benefitCapacity: "Build your capacity",
  benefitOpportunity: "Create opportunities",
  process: defaultHomeProcess,
  supportCards: defaultSupportGroups,
  supportHeading: "Who we support",
  supportIntroduction:
    "The SME Fund is open to any Namibian MSME with high potential, inclusive impact and a commitment to growth. Our priority areas include:",
  newsHeading: "Latest News & Resources",
  newsIntroduction:
    "Updates, stories and useful materials for Namibian entrepreneurs.",
  summary:
    "Funding and business development support for Namibian MSMEs ready to grow.",
  title: "Your business has potential. We help you take the next step.",
  trackingLabel: "Track Application",
};

