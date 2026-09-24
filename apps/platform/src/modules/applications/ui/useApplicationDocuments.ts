"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientApplicationDocumentService } from "./ClientApplicationDocumentService";

export const applicationDocumentQueryKeys = {
  list: (applicationId: string) =>
    ["portal", "applications", applicationId, "documents"] as const,
};

export function useApplicationDocuments(applicationId: string) {
  return useQuery({
    queryFn: () => clientApplicationDocumentService.list(applicationId),
    queryKey: applicationDocumentQueryKeys.list(applicationId),
    refetchInterval: (query) => query.state.data?.documents.some(
      (document) => document.storageStatus === "pending",
    ) ? 5_000 : false,
  });
}

export function useUploadApplicationDocument(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; requirementKey: string }) =>
      clientApplicationDocumentService.upload(
        applicationId,
        input.requirementKey,
        input.file,
      ),
    onSuccess: (register) => {
      queryClient.setQueryData(
        applicationDocumentQueryKeys.list(applicationId),
        register,
      );
      void queryClient.invalidateQueries({
        queryKey: ["portal", "applications", applicationId, "readiness"],
      });
    },
  });
}
