"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/client-http";
import { toast } from "@/shared/ui/Toast";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
import { clientChatbotDocumentService as client } from "../../ClientChatbotDocumentService";

export function useUploadChatbotDocument() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.upload,
    onError: (error) =>
      toast.error(getErrorMessage(error) ?? "Unable to upload document."),
    onSuccess: async () => {
      toast.success("Document uploaded. Review its text before activating it.");
      await cache.invalidateQueries({ queryKey: ["chatbot-resources"] });
    },
  });
}

export function useChatbotDocument(id: string | null) {
  const query = useQuery({
    queryKey: ["chatbot-document", id],
    queryFn: ({ signal }) => client.preview(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
  useQueryErrorToast(query);
  return query;
}
