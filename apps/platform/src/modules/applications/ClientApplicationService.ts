"use client";

import {
  patchData,
  postData,
  requestData,
  requestJson,
} from "@/lib/client-http";
import type { ApplicationUpdateInput } from "./ApplicationSchemas";
import type {
  AdminApplication,
  ApplicationSummary,
  ApplicationListInput,
  ApplicationPage,
  ApplicationView,
} from "./ApplicationTypes";

async function getAll() {
  return requestJson<AdminApplication[]>("/api/admin/applications", {
    cache: "no-store",
  });
}

type ApplicationListEnvelope = {
  data: ApplicationSummary[];
  page: Omit<ApplicationPage, "items">;
};

async function listOwnApplications(
  input: ApplicationListInput,
): Promise<ApplicationPage> {
  const query = new URLSearchParams({ limit: String(input.limit) });
  if (input.after) query.set("after", input.after);
  if (input.status) query.set("status", input.status);
  const envelope = await requestJson<ApplicationListEnvelope>(
    `/api/portal/applications?${query.toString()}`,
    { cache: "no-store" },
  );
  return { items: envelope.data, ...envelope.page };
}

function getOwnApplication(id: string) {
  return requestData<ApplicationView>(`/api/portal/applications/${id}`, {
    cache: "no-store",
  });
}

function createApplication(fundingOpportunityId: number) {
  return postData<ApplicationView, { fundingOpportunityId: number }>(
    "/api/portal/applications",
    { fundingOpportunityId },
  );
}

function updateOwnApplication(id: string, input: ApplicationUpdateInput) {
  return patchData<ApplicationView, ApplicationUpdateInput>(
    `/api/portal/applications/${id}`,
    input,
  );
}

export const clientApplicationService = {
  createApplication,
  getOwnApplication,
  getAll,
  listOwnApplications,
  updateOwnApplication,
};
