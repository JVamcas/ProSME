"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { GeneralButton } from "@/components/ui/button";

type Consent = "accepted" | "declined" | null;
const cookieName = "smefund_analytics_consent";

export function AnalyticsConsent({
  measurementId: configuredId,
}: {
  measurementId?: string | null;
}) {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const measurementId =
    configuredId && /^G-[A-Z0-9]+$/.test(configuredId)
      ? configuredId
      : undefined;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const match = document.cookie
        .split("; ")
        .find((item) => item.startsWith(`${cookieName}=`));
      setConsent((match?.split("=")[1] as Consent) ?? null);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function choose(value: Exclude<Consent, null>) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${cookieName}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    setConsent(value);
  }

  return (
    <>
      {consent === "accepted" && measurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script
            id="smefund-analytics"
            strategy="afterInteractive"
          >{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true});`}</Script>
        </>
      ) : null}
      {ready && consent === null ? (
        <aside
          className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-3xl rounded-2xl bg-navy p-5 text-white shadow-2xl"
          aria-label="Analytics consent"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm leading-6 text-white/80">
              <strong className="text-white">Your privacy choices.</strong> We
              use optional analytics only with your consent. Essential site
              functions do not depend on analytics.
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
      ) : null}
    </>
  );
}
