"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { clientApplicationService } from "../ClientApplicationService";
import type { AdminApplicationExportInput } from "../api/AdminApplicationSchemas";
import { applicationQueryKeys } from "./ApplicationQueryKeys";

export function useAdminApplicationFilterOptions() {
  return useQuery({
    queryKey: [...applicationQueryKeys.admin, "filter-options"],
    queryFn: () => clientApplicationService.applicationFilterOptions(),
  });
}

export function useExportAdminApplications() {
  return useMutation({
    mutationFn: (input: AdminApplicationExportInput) =>
      clientApplicationService.exportApplications(input),
  });
}
