import { websiteAnalyticsPage } from "./WebsiteAnalyticsCollection";

export const websiteJourneyLabels = {
  home: "Home",
  about: "About the SME Fund",
  contact: "Contact",
  faq: "FAQs",
  funding: "Funding calls",
  eligibility: "Eligibility check",
  how_to_apply: "How to apply",
  call_details: "Call details",
  start_application: "Start application",
  news: "News",
  news_article: "News article",
  events: "Events",
  event_details: "Event details",
  resources: "Resources",
  resource_details: "Resource details",
  terms: "Terms",
  privacy: "Privacy",
} as const;

export type WebsiteJourneyStep = keyof typeof websiteJourneyLabels;
export type WebsiteUserJourney = { steps: WebsiteJourneyStep[]; users: number };

const routeSteps: Record<string, WebsiteJourneyStep> = {
  "/": "home",
  "/about": "about",
  "/contact": "contact",
  "/faq": "faq",
  "/funding": "funding",
  "/how-to-apply/funding": "funding",
  "/eligibility": "eligibility",
  "/how-to-apply/eligibility": "eligibility",
  "/how-to-apply": "how_to_apply",
  "/news": "news",
  "/news/:slug": "news_article",
  "/events": "events",
  "/events/:slug": "event_details",
  "/resources": "resources",
  "/resources/:slug": "resource_details",
  "/terms": "terms",
  "/privacy": "privacy",
};

export function isWebsiteJourneyStep(
  value: unknown,
): value is WebsiteJourneyStep {
  return (
    typeof value === "string" && Object.hasOwn(websiteJourneyLabels, value)
  );
}

export function websiteJourneyStep(
  pathname: string,
): WebsiteJourneyStep | null {
  const page = websiteAnalyticsPage(pathname);
  if (!page || !["public", "funding-call"].includes(page.category)) return null;
  if (page.fundingCallId) {
    if (page.path.endsWith("/eligibility")) return "eligibility";
    if (page.path.endsWith("/apply")) return "start_application";
    return "call_details";
  }
  return routeSteps[page.path] ?? null;
}

export function parseWebsiteJourney(
  value: string,
): WebsiteJourneyStep[] | null {
  const steps = value.split(">");
  if (
    steps.length < 2 ||
    steps.length > 3 ||
    !steps.every(isWebsiteJourneyStep) ||
    steps.some((step, index) => index > 0 && step === steps[index - 1])
  ) {
    return null;
  }
  return steps as WebsiteJourneyStep[];
}
