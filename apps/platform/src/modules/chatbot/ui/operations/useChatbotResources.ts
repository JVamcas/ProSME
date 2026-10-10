"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/client-http";
import { toast } from "@/shared/ui/Toast";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
import { clientChatbotResourceService as client } from "../../ClientChatbotResourceService";
import type { ChatbotResourceQuery } from "../../api/ChatbotResourceSchemas";

const keys = ["chatbot-resources"] as const;
export function useChatbotResources(input: ChatbotResourceQuery) {
  const query = useQuery({
    queryKey: [...keys, input],
    queryFn: ({ signal }) => client.list(input, signal),
  });
  useQueryErrorToast(query);
  return query;
}

export function useUpdateChatbotResources() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.update,
    onError: (error) =>
      toast.error(
        getErrorMessage(error) ?? "Unable to update chatbot resources.",
      ),
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}
