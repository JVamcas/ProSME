"use client";

import { websiteAnalyticsPage } from "./domain/WebsiteAnalyticsCollection";

type Clarity = (typeof import("clarity-js"))["clarity"];
let sdk: Clarity | null = null;
let generation = 0;
let guardsInstalled = false;

const approvedPublicPages = new Set([
  "/",
  "/about",
  "/how-to-apply",
  "/how-to-apply/funding",
  "/funding",
  "/news",
  "/events",
  "/resources",
  "/faq",
  "/terms",
  "/privacy",
]);

export function isApprovedClarityPage(url: URL) {
  if (url.search || url.hash) return false;
  const page = websiteAnalyticsPage(url.pathname);
  if (!page) return false;
  if (approvedPublicPages.has(page.path)) return true;
  return (
    page.category === "funding-call" &&
    !page.path.endsWith("/eligibility") &&
    !page.path.endsWith("/apply")
  );
}

function stop() {
  generation += 1;
  sdk?.consentv2({ ad_Storage: "denied", analytics_Storage: "denied" });
  sdk?.stop();
}

function installNavigationGuards() {
  if (guardsInstalled) return;
  guardsInstalled = true;
  // Stop before Next changes history/DOM, rather than waiting for React effects.
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method].bind(history);
    history[method] = (data, unused, url) => {
      if (url && new URL(url, location.href).href !== location.href) stop();
      original(data, unused, url);
    };
  }
  window.addEventListener("popstate", stop, true);
  document.addEventListener(
    "click",
    (event) => {
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        anchor?.href &&
        new URL(anchor.href, location.href).href !== location.href
      )
        stop();
    },
    true,
  );
}

async function update(projectId: string | null | undefined, accepted: boolean) {
  stop();
  if (!accepted || !projectId || !/^[a-z0-9]{5,30}$/.test(projectId)) return;
  if (!isApprovedClarityPage(new URL(location.href))) return;
  // Clarity observes the browser's referrer independently of GA. Reject unsafe ones.
  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (
        referrer.search ||
        referrer.hash ||
        (referrer.origin === location.origin &&
          !isApprovedClarityPage(referrer))
      )
        return;
    } catch {
      return;
    }
  }
  installNavigationGuards();
  const expectedGeneration = generation;
  try {
    const library = await import("clarity-js");
    if (
      expectedGeneration !== generation ||
      !isApprovedClarityPage(new URL(location.href))
    )
      return;
    sdk = library.clarity;
    document.body.setAttribute("data-clarity-mask", "true");
    sdk.start({
      projectId,
      upload: "https://www.clarity.ms/collect",
      track: false,
      content: false,
      mask: ["body"],
      fraud: false,
      diagnostics: false,
      includeSubdomains: false,
    });
    sdk.consentv2({ ad_Storage: "denied", analytics_Storage: "granted" });
  } catch {
    // Heatmap loading is optional and must never block page navigation.
    stop();
  }
}

export const clientClarityService = { stop, update };
