"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  FundingCallCreateInput,
  FundingCallUpdateInput,
} from "./api/FundingCallSchemas";
import type { FundingCallPage, FundingCallView } from "./api/FundingCallTransport";
import type { PublishedFormOption } from "@/modules/forms/FormTypes";

const jsonHeaders = { "Content-Type": "application/json" };

type ListEnvelope = {
  data: FundingCallView[];
  page: Omit<FundingCallPage, "items"> & { nextCursor: string | null };
};

async function list(input: { page: number; pageSize: number }) {
  const query = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
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

function listBindableFormVersions() {
  return requestData<PublishedFormOption[]>(
    "/api/admin/funding-calls/form-versions",
    { cache: "no-store" },
  );
}

export const clientFundingCallService = {
  create,
  get,
  list,
  listBindableFormVersions,
  update,
};
