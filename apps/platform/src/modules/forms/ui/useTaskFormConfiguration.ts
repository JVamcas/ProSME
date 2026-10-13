"use client";

import { useQuery } from "@tanstack/react-query";
import { clientFormsService } from "../ClientFormsService";

export function useTaskFormOptions() {
  return useQuery({
    queryKey: ["admin", "forms", "bindable"],
    queryFn: clientFormsService.listTaskFormOptions,
  });
}

export function useConfiguredFormPreview(versionId: string | null) {
  return useQuery({
    enabled: Boolean(versionId),
    queryKey: ["admin", "forms", "preview", versionId],
    queryFn: () => clientFormsService.getConfiguredPreview(versionId!),
  });
}
