import { vi } from "vitest";

export function createWebsiteAnalyticsBrowserFixture() {
  vi.resetModules();
  let cookie = "";
  const location = new URL(
    "https://example.test/portal/applications/private-id/edit?email=secret#answer",
  );
  const dataLayer: IArguments[] = [];
  const appended: unknown[] = [];
  const storage = new Map<string, string>();
  vi.stubGlobal("window", { location, dataLayer });
  vi.stubGlobal("document", {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    },
    referrer: "https://example.test/register?email=secret",
    createElement: () => ({}),
    head: { appendChild: (element: unknown) => appended.push(element) },
  });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key),
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  return {
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    },
    location,
    dataLayer,
    appended,
    storage,
  };
}

export async function loadWebsiteAnalyticsService() {
  return (await import("@/modules/reporting/ClientWebsiteAnalyticsService"))
    .clientWebsiteAnalyticsService;
}
