"use client";

import type { ReactNode } from "react";
import { clientWebsiteAnalyticsService } from "../ClientWebsiteAnalyticsService";

export function TrackedCallDocumentLink({
  children,
  className,
  fundingCallId,
  href,
}: {
  children: ReactNode;
  className?: string;
  fundingCallId: string;
  href: string;
}) {
  return (
    <a
      className={className}
      href={href}
      onClick={() =>
        clientWebsiteAnalyticsService.track("call_document_download", {
          fundingCallId,
        })
      }
    >
      {children}
    </a>
  );
}
