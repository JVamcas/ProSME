export const websiteAnalyticsEvents = [
  "funding_call_view",
  "call_document_download",
  "eligibility_check_complete",
  "application_start",
  "application_submit",
] as const;

export type WebsiteAnalyticsEvent = (typeof websiteAnalyticsEvents)[number];
export const selfCheckOutcomes = [
  "likely-eligible",
  "not-currently-eligible",
  "review-required",
] as const;
export type SelfCheckOutcome = (typeof selfCheckOutcomes)[number];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const publicPages = new Set([
  "/",
  "/about",
  "/contact",
  "/faq",
  "/funding",
  "/eligibility",
  "/how-to-apply",
  "/how-to-apply/funding",
  "/how-to-apply/eligibility",
  "/news",
  "/events",
  "/resources",
  "/terms",
  "/privacy",
]);
const authPages = new Set([
  "/sign-in",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/auth/action",
]);
const portalPages = new Set([
  "/portal",
  "/portal/applications",
  "/portal/applications/new",
  "/portal/applications/new/confirmation",
  "/portal/funding-opportunities",
]);

export function isAnalyticsFundingCallId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

/** Only approved routes are collected; all private identifiers become templates. */
export function websiteAnalyticsPage(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  if (publicPages.has(path)) return { path, category: "public" as const };
  if (authPages.has(path)) return { path, category: "auth" as const };
  if (portalPages.has(path)) return { path, category: "applicant" as const };
  const call = path.match(
    /^\/(?:how-to-apply\/)?funding\/([^/]+)(\/eligibility|\/apply)?$/,
  );
  if (call && isAnalyticsFundingCallId(call[1])) {
    return { path, category: "funding-call" as const, fundingCallId: call[1] };
  }
  if (/^\/(news|events|resources)\/[^/]+$/.test(path)) {
    return {
      path: `/${path.split("/")[1]}/:slug`,
      category: "public" as const,
    };
  }
  if (/^\/portal\/funding-opportunities\/[^/]+(\/eligibility)?$/.test(path)) {
    return {
      path: `/portal/funding-opportunities/:id${path.endsWith("/eligibility") ? "/eligibility" : ""}`,
      category: "applicant" as const,
    };
  }
  if (/^\/portal\/applications\/[^/]+(\/edit)?$/.test(path)) {
    return {
      path: `/portal/applications/:id${path.endsWith("/edit") ? "/edit" : ""}`,
      category: "applicant" as const,
    };
  }
  return null;
}

export function sanitizedAnalyticsReferrer(value: string, origin: string) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    if (url.origin !== origin) return url.origin;
    const page = websiteAnalyticsPage(url.pathname);
    return page ? `${origin}${page.path}` : "";
  } catch {
    return "";
  }
}
