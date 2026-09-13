import type { PublicPageContent, StatisticItem } from "./ContentTypes";

export const defaultStatistics: StatisticItem[] = [
  { value: "7", label: "Funding Calls" },
  { value: "14", label: "Regions Covered" },
  { value: "N$50,000–N$100,000", label: "Grant Range" },
  { value: "200+", label: "MSMEs Targeted" },
];

export const defaultSupportGroups = [
  { label: "Youth-owned businesses", description: "Supporting young entrepreneurs to build a brighter future." },
  { label: "Women-owned businesses", description: "Backing women-led enterprises to grow and create opportunities." },
  { label: "Growth-stage MSMEs", description: "Helping established MSMEs scale, innovate and create jobs." },
  { label: "Businesses in priority sectors", description: "Including green economy, agro-processing, tourism, manufacturing and more." },
];

export const focusSectors = [
  "Agriculture & agro-processing",
  "Artisanal mining",
  "Blue economy",
  "Circular economy",
  "Culture & creative industries",
  "Financial services",
  "Health, wellness & grooming",
  "Information and communication technology",
  "Manufacturing",
  "Renewable energy & green technologies",
  "Tourism & hospitality",
  "Other high-growth sectors",
];

export const defaultPages: Record<string, PublicPageContent> = {
  about: {
    blocks: [],
    title: "About the SME Fund",
    summary: "An initiative under the ProSME Project strengthening Namibia’s MSME ecosystem through finance and practical business support.",
    content: null,
  },
  privacy: {
    blocks: [],
    title: "Privacy policy",
    summary: "How the SME Fund website collects, uses and protects personal information.",
    content: null,
  },
  terms: {
    blocks: [],
    title: "Terms and conditions",
    summary: "The terms that apply when using this website and its information services.",
    content: null,
  },
};

export const approvedPageParagraphs: Record<string, string[]> = {
  about: [
    "The SME Fund aims to strengthen the sustainability, competitiveness and growth potential of Micro, Small and Medium Enterprises (MSMEs) in Namibia.",
    "Implemented by the Namibia Investment Promotion and Development Board in partnership with the National Planning Commission and with support from GIZ, the Fund provides grant funding and enterprise development support through a transparent, competitive and merit-based process.",
    "The Fund supports sustainable growth, innovation, employment creation and economic diversification. It welcomes eligible Namibian MSMEs from every sector, with priority consideration for enterprises in identified focus areas.",
  ],
  privacy: [
    "We collect information that you choose to submit through contact, subscription and application services. We use it only to respond, administer programme services, meet legal obligations and improve the website.",
    "We limit access to authorised personnel and service providers, retain information only as required, and apply reasonable safeguards. You may request access, correction or deletion where applicable by contacting info@smefund.na.",
    "Optional analytics are disabled until you give consent. You can change that choice by clearing the site’s consent cookie.",
  ],
  terms: [
    "Website information is provided for general guidance and does not guarantee eligibility, selection or funding. Published funding-call documents and formal communications take precedence.",
    "You must provide accurate information, respect intellectual-property rights and avoid disrupting the website. External links are provided for convenience and remain subject to their owners’ terms.",
    "The SME Fund may update these terms and website content. Contact info@smefund.na if you need clarification before relying on published information.",
  ],
};

export const approvedFaqFallback = [
  ["What is the SME Fund?", "The SME Fund supports Namibian MSMEs through funding and business support that promote growth, innovation, competitiveness and job creation."],
  ["When do applications open and close?", "The first call for applications has closed. Please check back soon for the deadlines for the second call for applications."],
  ["Who is eligible to apply?", "Applicants must be formally registered and compliant, at least 51% Namibian-owned, operational for at least one year, and able to demonstrate a viable business model and active bank account."],
  ["What types of businesses can apply?", "Micro enterprises with annual turnover up to N$300,000, small enterprises up to N$3 million, and medium enterprises up to N$10 million may apply."],
  ["Can startups apply?", "A business must have operated for at least one year and demonstrate activity through an existing product, service or prototype."],
  ["Which sectors are eligible?", "The SME Fund welcomes applications from all sectors of the Namibian economy. Listed focus sectors receive priority consideration but do not exclude other sectors."],
  ["How do I apply or get assistance?", "Use the Apply Now link when a call is open. For assistance, email info@smefund.na."],
] as const;
