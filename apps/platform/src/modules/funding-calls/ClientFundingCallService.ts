"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  FundingCallCreateInput,
  FundingCallGovernanceCommandInput,
  FundingCallListInput,
  FundingCallUpdateInput,
} from "./api/FundingCallSchemas";
import type { FundingCallPage, FundingCallView } from "./api/FundingCallTransport";
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

function clone(id: string) {
  return requestData<FundingCallView>(
    `/api/admin/funding-calls/${id}/clone`,
    { method: "POST" },
  );
}

function deleteFundingCall(id: string) {
  return requestData<{ id: string }>(`/api/admin/funding-calls/${id}`, {
    method: "DELETE",
  });
}

function get(id: string) {
  return requestData<FundingCallView>(`/api/admin/funding-calls/${id}`, {
    cache: "no-store",
  });
}

function update(id: string, input: FundingCallUpdateInput) {
  return requestData<FundingCallView>(`/api/admin/funding-calls/${id}`, {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "PATCH",
  });
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

export const clientFundingCallService = {
  changeGovernanceStatus,
  clone,
  create,
  delete: deleteFundingCall,
  get,
  list,
  listBindableEligibilityRuleSetVersions,
  listBindableFormVersions,
  listBindableWorkflowTemplateVersions,
  publish,
  previewReadiness,
  update,
};
