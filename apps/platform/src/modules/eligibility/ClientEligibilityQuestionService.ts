"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  EligibilityQuestionInput,
  EligibilityQuestionUpdateInput,
} from "./api/EligibilityQuestionSchemas";
import type {
  EligibilityQuestionPage,
  EligibilityQuestionSummary,
} from "./api/EligibilityQuestionTransport";

const jsonHeaders = { "Content-Type": "application/json" };

type ListEnvelope = {
  data: EligibilityQuestionSummary[];
  page: Omit<EligibilityQuestionPage, "items"> & { nextCursor: string | null };
};

async function list(input: { page: number; pageSize: number }) {
  const query = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const envelope = await requestJson<ListEnvelope>(
    `/api/admin/eligibility-questions?${query.toString()}`,
    { cache: "no-store" },
  );
  return { items: envelope.data, ...envelope.page };
}

function create(input: EligibilityQuestionInput) {
  return requestData<EligibilityQuestionSummary>(
    "/api/admin/eligibility-questions",
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "POST",
    },
  );
}

function update(id: string, input: EligibilityQuestionUpdateInput) {
  return requestData<EligibilityQuestionSummary>(
    `/api/admin/eligibility-questions/${id}`,
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "PATCH",
    },
  );
}

export const clientEligibilityQuestionService = { create, list, update };
