"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  FundingCallCreateInput,
  FundingCallCreationProgressSaveInput,
  FundingCallGovernanceCommandInput,
  FundingCallLifecycleCommandInput,
  FundingCallListInput,
  FundingCallUpdateInput,
} from "./api/FundingCallSchemas";
import type {
  FundingCallCreationProgressView,
  FundingCallPage,
  FundingCallView,
} from "./api/FundingCallTransport";
import type { FundingCallReadinessResult } from "./domain/FundingCallReadiness";
import type { PublishedFormOption } from "@/modules/forms/FormTypes";
import type { PublishedEligibilityRuleSetOption } from "@/modules/eligibility/api/EligibilityRuleSetTransport";

type BindableWorkflowTemplateVersionOption = {
  definitionId: string;
  name: string;
  status: "DRAFT" | "PUBLISHED";
  versionId: string;
  versionNumber: number;
};

const jsonHeaders = { "Content-Type": "application/json" };

type ListEnvelope = {
  data: FundingCallView[];
  page: Omit<FundingCallPage, "items"> & { nextCursor: string | null };
};

async function list(input: FundingCallListInput) {
  const query = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  if (input.fundingCallId) query.set("fundingCallId", input.fundingCallId);
  const envelope = await requestJson<ListEnvelope>(
    `/api/admin/funding-calls?${query.toString()}`,
    { cache: "no-store" },
  );
  return { items: envelope.data, ...envelope.page };
}

function create(input: FundingCallCreateInput) {
  return requestData<FundingCallView>("/api/admin/funding-calls", {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "POST",
  });
}

function getCreationProgress() {
  return requestData<FundingCallCreationProgressView | null>(
    "/api/admin/funding-calls/creation-progress",
    { cache: "no-store" },
  );
}

function saveCreationProgress(input: FundingCallCreationProgressSaveInput) {
  return requestData<FundingCallCreationProgressView>(
    "/api/admin/funding-calls/creation-progress",
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "PUT",
    },
  );
}

function clone(id: string) {
  return requestData<FundingCallView>(`/api/admin/funding-calls/${id}/clone`, {
    method: "POST",
  });
}

function deleteFundingCall(id: string) {
  return requestData<{ id: string }>(`/api/admin/funding-calls/${id}`, {
    method: "DELETE",
  });
}

function get(id: string, versionId?: string) {
  return requestData<FundingCallView>(
    `/api/admin/funding-calls/${id}${versionId ? `?versionId=${versionId}` : ""}`,
    {
      cache: "no-store",
    },
  );
}

function update(id: string, input: FundingCallUpdateInput) {
  return requestData<FundingCallView>(`/api/admin/funding-calls/${id}`, {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "PATCH",
  });
}

function uploadThumbnail(id: string, file: File, expectedRowVersion: number) {
  const body = new FormData();
  body.set("expectedRowVersion", String(expectedRowVersion));
  body.set("thumbnail", file);
  return requestData<FundingCallView>(
    `/api/admin/funding-calls/${id}/thumbnail`,
    { body, method: "PUT" },
  );
}

function removeThumbnail(id: string, expectedRowVersion: number) {
  return requestData<FundingCallView>(
    `/api/admin/funding-calls/${id}/thumbnail`,
    {
      body: JSON.stringify({ expectedRowVersion }),
      headers: jsonHeaders,
      method: "DELETE",
    },
  );
}

function publish(id: string, expectedRowVersion: number) {
  return requestData<FundingCallView>(
    `/api/admin/funding-calls/${id}/publish`,
    {
      body: JSON.stringify({ expectedRowVersion }),
      headers: {
        ...jsonHeaders,
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    },
  );
}

function changeGovernanceStatus(
  id: string,
  input: FundingCallGovernanceCommandInput,
) {
  return requestData<FundingCallView>(
    `/api/admin/funding-calls/${id}/governance`,
    {
      body: JSON.stringify(input),
      headers: {
        ...jsonHeaders,
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    },
  );
}

function changeLifecycleStatus(
  id: string,
  input: FundingCallLifecycleCommandInput,
) {
  return requestData<FundingCallView>(
    `/api/admin/funding-calls/${id}/lifecycle`,
    {
      body: JSON.stringify(input),
      headers: {
        ...jsonHeaders,
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    },
  );
}

function previewReadiness(id: string) {
  return requestData<FundingCallReadinessResult>(
    `/api/admin/funding-calls/${id}/readiness`,
    { cache: "no-store" },
  );
}

function listBindableFormVersions() {
  return requestData<PublishedFormOption[]>(
    "/api/admin/funding-calls/form-versions",
    { cache: "no-store" },
  );
}

function listBindableEligibilityRuleSetVersions() {
  return requestData<PublishedEligibilityRuleSetOption[]>(
    "/api/admin/funding-calls/eligibility-ruleset-versions",
    { cache: "no-store" },
  );
}

function listBindableWorkflowTemplateVersions() {
  return requestData<BindableWorkflowTemplateVersionOption[]>(
    "/api/admin/funding-calls/workflow-template-versions",
    { cache: "no-store" },
  );
}

function prepareReplacement(
  id: string,
  expectedRowVersion: number,
  sourceVersionId: string,
) {
  return requestData<FundingCallView>(
    `/api/admin/funding-calls/${id}/versions`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ expectedRowVersion, sourceVersionId }),
    },
  );
}

function versions(id: string, page: number) {
  return requestData<{
    items: {
      id: string;
      versionNumber: number;
      publishedAt: string;
      title: string;
      current: boolean;
    }[];
    page: number;
    pageSize: number;
    total: number;
  }>(`/api/admin/funding-calls/${id}/versions?page=${page}`, {
    cache: "no-store",
  });
}

export const clientFundingCallService = {
  changeLifecycleStatus,
  changeGovernanceStatus,
  clone,
  create,
  delete: deleteFundingCall,
  get,
  getCreationProgress,
  list,
  listBindableEligibilityRuleSetVersions,
  listBindableFormVersions,
  listBindableWorkflowTemplateVersions,
  publish,
  prepareReplacement,
  versions,
  previewReadiness,
  removeThumbnail,
  saveCreationProgress,
  update,
  uploadThumbnail,
};
