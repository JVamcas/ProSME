"use client";

import { deleteData, patchData, postData, requestData } from "@/lib/client-http";
import type { BusinessProfileInput } from "./BusinessSchemas";
import type { ApplicationBusinessOption, BusinessView } from "./BusinessTypes";

const noStore = { cache: "no-store" as const };

function listBusinesses() {
  return requestData<BusinessView[]>("/api/portal/businesses", noStore);
}

function listApplicationBusinesses(
  applicationId: string,
  fundingOpportunityId: string,
) {
  const query = new URLSearchParams({
    applicationId,
    fundingOpportunityId: String(fundingOpportunityId),
  });
  return requestData<ApplicationBusinessOption[]>(
    `/api/portal/businesses?${query.toString()}`,
    noStore,
  );
}

function getBusiness(id: string) {
  return requestData<BusinessView>(`/api/portal/businesses/${id}`, noStore);
}

function createBusiness(input: BusinessProfileInput) {
  return postData<BusinessView, BusinessProfileInput>(
    "/api/portal/businesses",
    input,
  );
}

function updateBusiness(id: string, input: BusinessProfileInput) {
  return patchData<BusinessView, BusinessProfileInput>(
    `/api/portal/businesses/${id}`,
    input,
  );
}

function deleteBusiness(id: string) {
  return deleteData<{ deleted: true }>(`/api/portal/businesses/${id}`);
}

export const clientBusinessService = {
  createBusiness,
  deleteBusiness,
  getBusiness,
  listApplicationBusinesses,
  listBusinesses,
  updateBusiness,
};
