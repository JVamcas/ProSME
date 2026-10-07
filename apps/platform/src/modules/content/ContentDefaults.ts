import type { PublicPageContent, StatisticItem } from "./ContentTypes";
import { defaultFundingSupport } from "./FundingPageContent";
import { defaultFocusSectorBlocks, defaultFundingOverviewBlocks } from "./FundingOverviewDefaults";

export const defaultHomeActionCards = {
  fundingTitle: "I want funding",
  fundingDescription: "Explore current opportunities and find the right funding for your business.",
  eligibilityTitle: "Am I eligible?",
  eligibilityDescription: "Check if your business meets the key criteria before you apply.",
  trackingTitle: "I already applied",
  trackingDescription: "Track your application and stay updated on the next steps.",
};

export const defaultHomeProcess = {
  heading: "How it works",
  introduction: "A simple, transparent process to get you from application to support.",
  steps: [
    { title: "Check eligibility", description: "See if your business meets the key criteria." },
    { title: "Prepare your business", description: "Get your documents ready and strengthen your application." },
    { title: "Apply online", description: "Submit your application through our secure portal." },
    { title: "Track your application", description: "Stay updated on your progress every step of the way." },
  ],
};

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
  faq: {
    blocks: [],
    eyebrow: "Help centre",
    title: "Frequently asked questions",
    summary: "Answers to common questions about the SME Fund and application process.",
    content: null,
  },
  funding: {
    blocks: defaultFundingOverviewBlocks,
    title: "Funding to move your business forward",
    summary:
      "Targeted grants and practical enterprise support for eligible Namibian MSMEs with a feasible model, real traction and ambition to grow.",
    content: null,
  },
  eligibility: {
    blocks: defaultFocusSectorBlocks,
    title: "Check your eligibility",
    summary: "",
    content: null,
  },
  "how-to-apply": {
    blocks: [],
    eyebrow: "A guided application",
    title: "Know what you need before you begin",
    summary:
      "Follow the application guidance and prepare your supporting documents in advance.",
    content: null,
  },
  about: {
    blocks: [],
    title: "About the SME Fund",
    summary: "An initiative under the SME Fund Project strengthening Namibia’s MSME ecosystem through finance and practical business support.",
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
  faq: ["The answers below are maintained by the programme content team."],
  funding: [defaultFundingSupport.description],
  eligibility: [
    "This checker is private and indicative. Final eligibility is confirmed through document verification and formal screening.",
    "",
  ],
  "how-to-apply": [
    "Check the current funding call and complete the eligibility checker before applying.",
    "Prepare current, legible PDF copies of the supporting documents listed in the published funding criteria.",
    "Complete each application section, review the declaration and retain your application reference after submission.",
  ],
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
