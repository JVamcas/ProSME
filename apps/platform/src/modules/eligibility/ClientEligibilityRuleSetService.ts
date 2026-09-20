"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  CreateEligibilityRuleSetInput,
  EligibilityRuleSetBuilderView,
  EligibilityRuleSetPage,
  EligibilityRuleSetSummary,
  UpdateEligibilityRuleSetBuilderInput,
} from "./api/EligibilityRuleSetTransport";
import type { EligibilityTestInput } from "./api/EligibilityTestSchemas";
import type { EligibilityEvaluationResult } from "./domain/EligibilityEvaluation";

const jsonHeaders = { "Content-Type": "application/json" };

type ListEnvelope = {
  data: EligibilityRuleSetSummary[];
  page: Omit<EligibilityRuleSetPage, "items"> & { nextCursor: string | null };
};

async function list(input: { page: number; pageSize: number }) {
  const query = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const envelope = await requestJson<ListEnvelope>(
    `/api/admin/eligibility-rulesets?${query.toString()}`,
    { cache: "no-store" },
  );
  return { items: envelope.data, ...envelope.page };
}

function create(input: CreateEligibilityRuleSetInput) {
  return requestData<{ definition: { id: string } }>(
    "/api/admin/eligibility-rulesets",
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "POST",
    },
  );
}

function get(id: string) {
  return requestData<EligibilityRuleSetBuilderView>(
    `/api/admin/eligibility-rulesets/${id}`,
    { cache: "no-store" },
  );
}

function update(id: string, input: UpdateEligibilityRuleSetBuilderInput) {
  return requestData<EligibilityRuleSetBuilderView>(
    `/api/admin/eligibility-rulesets/${id}`,
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "PATCH",
    },
  );
}

function lifecycle(
  id: string,
  input:
    | { action: "CLONE"; sourceVersionId: string }
    | {
        action: "PUBLISH" | "RETIRE";
        expectedRowVersion: number;
        versionId: string;
      },
) {
  return requestData<unknown>(
    `/api/admin/eligibility-rulesets/${id}/lifecycle`,
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "POST",
    },
  );
}

function test(id: string, input: EligibilityTestInput) {
  return requestData<EligibilityEvaluationResult & { authoritative: false }>(
    `/api/admin/eligibility-rulesets/${id}/test`,
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "POST",
    },
  );
}

export const clientEligibilityRuleSetService = {
  create,
  get,
  lifecycle,
  list,
  test,
  update,
};
