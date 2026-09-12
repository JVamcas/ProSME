"use client";

import { requestJson } from "@/lib/client-http";
import type { AdminApplication } from "./application.types";

async function getAll() {
  return requestJson<AdminApplication[]>("/api/applications", {
    cache: "no-store",
  });
}

export const applicationClientService = {
  getAll,
};
