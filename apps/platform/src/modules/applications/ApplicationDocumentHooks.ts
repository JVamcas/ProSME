"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApplicationDocumentType } from "./ApplicationDocumentSchemas";
import { clientApplicationDocumentService } from "./ClientApplicationDocumentService";

export const applicationDocumentQueryKeys = {
  list: (applicationId: string) =>
    ["portal", "applications", applicationId, "documents"] as const,
};

export function useApplicationDocuments(applicationId: string) {
  return useQuery({
    queryFn: () => clientApplicationDocumentService.list(applicationId),
    queryKey: applicationDocumentQueryKeys.list(applicationId),
  });
}

export function useUploadApplicationDocument(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { documentType: ApplicationDocumentType; file: File }) =>
      clientApplicationDocumentService.upload(
        applicationId,
        input.documentType,
        input.file,
      ),
    onSuccess: (documents) => {
      queryClient.setQueryData(
        applicationDocumentQueryKeys.list(applicationId),
        documents,
      );
    },
  });
}
