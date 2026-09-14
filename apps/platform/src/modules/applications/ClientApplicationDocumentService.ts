"use client";

import { requestData } from "@/lib/client-http";
import type {
  ApplicationDocumentType,
  ApplicationDocumentView,
} from "./ApplicationDocumentSchemas";

function list(applicationId: string) {
  return requestData<ApplicationDocumentView[]>(
    `/api/portal/applications/${applicationId}/documents`,
    { cache: "no-store" },
  );
}

function upload(
  applicationId: string,
  documentType: ApplicationDocumentType,
  file: File,
) {
  const body = new FormData();
  body.set("documentType", documentType);
  body.set("file", file);
  return requestData<ApplicationDocumentView[]>(
    `/api/portal/applications/${applicationId}/documents`,
    { body, method: "POST" },
  );
}

export const clientApplicationDocumentService = { list, upload };
