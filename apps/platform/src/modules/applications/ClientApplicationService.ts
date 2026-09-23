"use client";

import {
  deleteData,
  patchData,
  requestData,
  requestJson,
} from "@/lib/client-http";
import type {
  CreateApplicationDraftInput,
  SaveApplicationDraftInput,
} from "./ApplicationSchemas";
import type { ApplicationSubmissionCommandInput } from "./api/ApplicationSubmissionSchemas";
import type {
  AdminApplication,
  AdminApplicationListInput,
  AdminApplicationListRow,
  AdminApplicationPage,
  ApplicationSummary,
  ApplicationListInput,
  ApplicationPage,
  ApplicationSubmission,
  ApplicationDraftView,
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
  return requestData<ApplicationDraftView>(`/api/portal/applications/${id}`, {
    cache: "no-store",
  });
}

function createApplication(input: CreateApplicationDraftInput) {
  return requestData<ApplicationDraftView>("/api/portal/applications", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    method: "POST",
  });
}

function saveApplicationDraft(id: string, input: SaveApplicationDraftInput) {
  return patchData<ApplicationDraftView, SaveApplicationDraftInput>(
    `/api/portal/applications/${id}`,
    input,
  );
}

function deleteApplicationDraft(id: string) {
  return deleteData<{ id: string }>(`/api/portal/applications/${id}`);
}

function submitApplication(
  id: string,
  input: ApplicationSubmissionCommandInput,
) {
  return requestData<ApplicationSubmission>(
    `/api/portal/applications/${id}/submit`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    },
  );
}

export const clientApplicationService = {
  createApplication,
  deleteApplicationDraft,
  getOwnApplication,
  getAll,
  listAdminApplications,
  listOwnApplications,
  submitApplication,
  saveApplicationDraft,
};
