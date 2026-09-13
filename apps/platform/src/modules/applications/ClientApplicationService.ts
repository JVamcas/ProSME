"use client";

import { requestJson } from "@/lib/client-http";
import type { AdminApplication } from "./ApplicationTypes";

async function getAll() {
  return requestJson<AdminApplication[]>("/api/admin/applications", {
    cache: "no-store",
  });
}

export const clientApplicationService = {
  getAll,
};
