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
  AdminApplicationListInput,
  AdminApplicationListRow,
  AdminApplicationPage,
  ApplicationSummary,
  ApplicationListInput,
  ApplicationPage,
  ApplicationView,
  ApplicationSubmission,
} from "./ApplicationTypes";

async function getAll() {
  return requestJson<AdminApplication[]>("/api/admin/applications", {
    cache: "no-store",
  });
}

type AdminApplicationEnvelope = {
  data: AdminApplicationListRow[];
  page: Omit<AdminApplicationPage, "items">;
};

async function listAdminApplications(
  input: AdminApplicationListInput,
): Promise<AdminApplicationPage> {
  const query = new URLSearchParams({
    limit: String(input.limit),
    status: input.status,
  });
  if (input.after) query.set("after", input.after);
  if (input.search) query.set("search", input.search);
  if (input.stage) query.set("stage", input.stage);
  const envelope = await requestJson<AdminApplicationEnvelope>(
    `/api/admin/applications?${query.toString()}`,
    { cache: "no-store" },
  );
  return { items: envelope.data, ...envelope.page };
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

function submitApplication(id: string) {
  return requestData<ApplicationSubmission>(
    `/api/portal/applications/${id}/submit`,
    {
      headers: { "Idempotency-Key": crypto.randomUUID() },
      method: "POST",
    },
  );
}

export const clientApplicationService = {
  createApplication,
  getOwnApplication,
  getAll,
  listAdminApplications,
  listOwnApplications,
  submitApplication,
  updateOwnApplication,
};
