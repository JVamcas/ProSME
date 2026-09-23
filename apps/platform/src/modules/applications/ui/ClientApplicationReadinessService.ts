"use client";

import { requestData } from "@/lib/client-http";
import type { ApplicationReadiness } from "../domain/ApplicationReadiness";

function get(applicationId: string) {
  return requestData<ApplicationReadiness>(
    `/api/portal/applications/${applicationId}/readiness`,
    { cache: "no-store" },
  );
}

export const clientApplicationReadinessService = { get };
