"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GeneralButton } from "@/shared/ui/Button";
import {
  clientWebsiteAnalyticsService,
  type WebsiteAnalyticsConsent as Consent,
} from "../ClientWebsiteAnalyticsService";

export function WebsiteAnalyticsConsent({
  measurementId,
}: {
  measurementId?: string | null;
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

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
    clientWebsiteAnalyticsService.chooseConsent(value);
    setConsent(value);
  }

  if (!ready || !measurementId) {
    return null;
  }
  if (consent !== null) {
    return (
      <GeneralButton
        className="fixed bottom-2 right-2 z-70"
        size="sm"
        variant="navy"
        onClick={() => {
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
          your experience.
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
