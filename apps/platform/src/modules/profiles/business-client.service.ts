"use client";

import { deleteData, patchData, postData, requestData } from "@/lib/client-http";
import type { BusinessProfileInput } from "./profile.schemas";
import type { BusinessView } from "./profile.types";

const noStore = { cache: "no-store" as const };

function listBusinesses() {
  return requestData<BusinessView[]>("/api/portal/businesses", noStore);
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

export const businessClientService = {
  createBusiness,
  deleteBusiness,
  getBusiness,
  listBusinesses,
  updateBusiness,
};
