"use client";

import { requestData } from "@/lib/client-http";
import type { ApplicationPreflight, ApplicationReadiness } from "../domain/ApplicationReadiness";

function get(applicationId: string) {
  return requestData<ApplicationReadiness>(
    `/api/portal/applications/${applicationId}/readiness`,
    { cache: "no-store" },
  );
}

function preflight(applicationId: string) {
  return requestData<ApplicationPreflight>(
    `/api/portal/applications/${applicationId}/preflight`,
    { method: "POST" },
  );
}

export const clientApplicationReadinessService = { get, preflight };
