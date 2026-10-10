// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/modules/reporting/ClientWebsiteHeatmapCaptureService", () => ({
  clientWebsiteHeatmapCaptureService: capture,
}));

import { WebsiteHeatmapCollection } from "@/modules/reporting/ui/WebsiteHeatmapCollection";
import { WebsiteAnalyticsConsent } from "@/modules/reporting/ui/WebsiteAnalyticsConsent";
import { clientWebsiteAnalyticsService } from "@/modules/reporting/ClientWebsiteAnalyticsService";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  document.cookie = "smefund_analytics_consent=; Max-Age=0; Path=/";
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function mount(measurementId?: string) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <WebsiteHeatmapCollection enabled />
        <WebsiteAnalyticsConsent measurementId={measurementId} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

describe("independent public heatmap collection", () => {
  it.each(["", "declined", "accepted"])(
    "starts without a heatmap consent prompt (%s)",
    async (consent) => {
      if (consent) {
        document.cookie = `smefund_analytics_consent=${consent}; Path=/`;
      }
      await mount();
      expect(capture.start).toHaveBeenCalledWith(true, expect.any(Function));
      expect(document.body.textContent).toBe("");
    },
  );

  it("keeps the Google Analytics choice independent of heatmap recording", async () => {
    const configure = vi.spyOn(clientWebsiteAnalyticsService, "configure");
    await mount("G-TEST123");
    expect(document.querySelector('[aria-label="Analytics consent"]')).toBeTruthy();
    expect(configure).not.toHaveBeenCalled();
    const decline = [...document.querySelectorAll("button")].find(
      (button) => button.textContent === "Decline",
    );
    expect(decline).toBeTruthy();
    await act(async () => decline!.click());
    expect(clientWebsiteAnalyticsService.readConsent()).toBe("declined");
    expect(configure).not.toHaveBeenCalled();
    expect(capture.start).toHaveBeenCalledOnce();
    expect(capture.stop).not.toHaveBeenCalled();
  });

  it("stops and flushes the active public view when unmounted", async () => {
    await mount();
    await act(async () => root.render(null));
    expect(capture.stop).toHaveBeenCalledWith(true);
  });
});
