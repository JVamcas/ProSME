"use client";

import { requestData } from "@/lib/client-http";
import type { BrandingSettingsView } from "./api/BrandingSchemas";

function getSettings() {
  return requestData<BrandingSettingsView>("/api/admin/branding", {
    cache: "no-store",
  });
}

function uploadLogo(file: File) {
  const body = new FormData();
  body.set("logo", file);
  return requestData<BrandingSettingsView>("/api/admin/branding", {
    body,
    method: "PUT",
  });
}

export const clientBrandingService = { getSettings, uploadLogo };
