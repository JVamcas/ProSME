"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GeneralButton } from "@/components/ui/button";
import { clientWebsiteHeatmapCaptureService } from "../ClientWebsiteHeatmapCaptureService";
import { useWebsiteHeatmapCollection } from "./useWebsiteHeatmapCollection";
import {
  clientWebsiteAnalyticsService,
  type WebsiteAnalyticsConsent as Consent,
} from "../ClientWebsiteAnalyticsService";

export function WebsiteAnalyticsConsent({
  measurementId,
  heatmapEnabled = false,
}: {
  measurementId?: string | null;
  heatmapEnabled?: boolean;
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  useWebsiteHeatmapCollection(
    heatmapEnabled,
    ready && consent === "accepted",
    pathname,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setConsent(clientWebsiteAnalyticsService.readConsent());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (
      ready &&
      consent === "accepted" &&
      clientWebsiteAnalyticsService.configure(measurementId)
    ) {
      clientWebsiteAnalyticsService.pageView(pathname);
    }
  }, [consent, measurementId, pathname, ready]);

  function choose(value: Exclude<Consent, null>) {
    if (value === "declined") {
      clientWebsiteHeatmapCaptureService.stop();
    }
    clientWebsiteAnalyticsService.chooseConsent(value);
    setConsent(value);
  }

  if (!ready || (!measurementId && !heatmapEnabled)) {
    return null;
  }
  if (consent !== null) {
    return (
      <GeneralButton
        className="fixed bottom-2 right-2 z-70"
        size="sm"
        variant="navy"
        onClick={() => {
          clientWebsiteHeatmapCaptureService.stop();
          clientWebsiteAnalyticsService.chooseConsent("declined");
          setConsent(null);
        }}
      >
        Analytics privacy
      </GeneralButton>
    );
  }
  return (
    <aside
      className="fixed inset-x-4 bottom-4 z-70 mx-auto max-w-3xl rounded-2xl bg-brand-navy p-5 text-white shadow-2xl"
      aria-label="Analytics consent"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-6 text-white/80">
          <strong className="text-white">Cookies on this website.</strong> We
          use optional cookies to understand how you use our website and improve
          your experience. If you accept, we also record masked clicks and
          scrolling on approved public pages. Applicant, staff and CMS forms are
          excluded.
        </p>
        <div className="flex gap-2">
          <GeneralButton
            type="button"
            variant="inverse"
            size="sm"
            onClick={() => choose("declined")}
          >
            Decline
          </GeneralButton>
          <GeneralButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => choose("accepted")}
          >
            Accept analytics
          </GeneralButton>
        </div>
      </div>
    </aside>
  );
}
