"use client";

import {
  isAnalyticsFundingCallId,
  sanitizedAnalyticsReferrer,
  selfCheckOutcomes,
  websiteAnalyticsEvents,
  websiteAnalyticsPage,
  type SelfCheckOutcome,
  type WebsiteAnalyticsEvent,
} from "./domain/WebsiteAnalyticsCollection";

export type WebsiteAnalyticsConsent = "accepted" | "declined" | null;
const cookieName = "smefund_analytics_consent";
let configuredId: string | null = null;
let lastPage: string | null = null;
const emitted = new Set<string>();

declare global {
  interface Window {
    dataLayer?: unknown[];
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

function command(...args: unknown[]) {
  const target = window;
  if (args.length === 0) return;
  target.dataLayer ??= [];
  // gtag's queue requires an Arguments object, rather than a plain array.
  // eslint-disable-next-line prefer-rest-params -- Google's documented gtag queue requires Arguments objects.
  target.dataLayer.push(arguments);
}

function readConsent(): WebsiteAnalyticsConsent {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName}=`));
  const value = cookie?.slice(cookieName.length + 1);
  return value === "accepted" || value === "declined" ? value : null;
}

function chooseConsent(value: Exclude<WebsiteAnalyticsConsent, null>) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${cookieName}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  if (configuredId) {
    window[`ga-disable-${configuredId}`] = value !== "accepted";
  }
  if (value === "declined") {
    lastPage = null;
    command("consent", "update", { analytics_storage: "denied" });
  }
}

function configure(measurementId: string | null | undefined) {
  if (
    readConsent() !== "accepted" ||
    !measurementId ||
    !/^G-[A-Z0-9]+$/.test(measurementId)
  ) {
    return false;
  }
  if (!websiteAnalyticsPage(window.location.pathname)) return false;
  window[`ga-disable-${measurementId}`] = false;
  if (configuredId === measurementId) {
    command("consent", "update", { analytics_storage: "granted" });
    return true;
  }
  configuredId = measurementId;
  command("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  command("js", new Date());
  command("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: `${window.location.origin}/`,
    page_referrer: sanitizedAnalyticsReferrer(
      document.referrer,
      window.location.origin,
    ),
    page_title: "SME Fund",
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  return true;
}

function pageView(pathname: string) {
  const page = websiteAnalyticsPage(pathname);
  if (
    !page ||
    !configuredId ||
    readConsent() !== "accepted" ||
    lastPage === pathname
  )
    return;
  lastPage = pathname;
  const metadata = {
    page_location: `${window.location.origin}${page.path}`,
    page_referrer: sanitizedAnalyticsReferrer(
      document.referrer,
      window.location.origin,
    ),
    page_title: `SME Fund ${page.category}`,
    page_category: page.category,
  };
  command("set", metadata);
  command("event", "page_view", metadata);
  if (
    page.fundingCallId &&
    !pathname.endsWith("/eligibility") &&
    !pathname.endsWith("/apply")
  ) {
    track("funding_call_view", { fundingCallId: page.fundingCallId });
  }
}

function track(
  event: WebsiteAnalyticsEvent,
  input: { fundingCallId: string; outcome?: SelfCheckOutcome },
  deduplicationKey?: string,
) {
  try {
    if (
      typeof window === "undefined" ||
      !configuredId ||
      readConsent() !== "accepted"
    )
      return;
    const page = websiteAnalyticsPage(window.location.pathname);
    if (
      !page ||
      !websiteAnalyticsEvents.includes(event) ||
      !isAnalyticsFundingCallId(input.fundingCallId)
    )
      return;
    if (
      event === "eligibility_check_complete" &&
      !selfCheckOutcomes.includes(input.outcome!)
    )
      return;
    const key = deduplicationKey
      ? `smefund:analytics:${event}:${deduplicationKey}`
      : null;
    if (key && emitted.has(key)) return;
    if (key) {
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        /* Tracking still works when storage is unavailable. */
      }
      emitted.add(key);
    }
    command("event", event, {
      funding_call_id: input.fundingCallId,
      page_category: page.category,
      page_location: `${window.location.origin}${page.path}`,
      page_title: `SME Fund ${page.category}`,
      page_referrer: sanitizedAnalyticsReferrer(
        document.referrer,
        window.location.origin,
      ),
      ...(event === "eligibility_check_complete"
        ? { eligibility_outcome: input.outcome }
        : {}),
    });
  } catch {
    /* Optional collection must never block the user's action. */
  }
}

export const clientWebsiteAnalyticsService = {
  chooseConsent,
  configure,
  pageView,
  readConsent,
  track,
};
