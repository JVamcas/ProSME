"use client";

import { requestData } from "@/lib/client-http";
import type { ApplicationDocumentRegister } from "../api/ApplicationDocumentSchemas";

function list(applicationId: string) {
  return requestData<ApplicationDocumentRegister>(
    `/api/portal/applications/${applicationId}/documents`,
    { cache: "no-store" },
  );
}

function upload(
  applicationId: string,
  requirementKey: string,
  file: File,
) {
  const body = new FormData();
  body.set("requirementKey", requirementKey);
  body.set("file", file);
  return requestData<ApplicationDocumentRegister>(
    `/api/portal/applications/${applicationId}/documents`,
    { body, method: "POST" },
  );
}

export const clientApplicationDocumentService = { list, upload };
