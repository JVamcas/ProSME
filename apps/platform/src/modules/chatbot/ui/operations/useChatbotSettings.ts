"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientChatbotSettingsService as client } from "../../ClientChatbotSettingsService";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
import { getErrorMessage } from "@/lib/client-http";
import { toast } from "@/shared/ui/Toast";

const keys = ["chatbot-settings"] as const;
export function useChatbotSettings() {
  const query = useQuery({
    queryKey: keys,
    queryFn: ({ signal }) => client.read(signal),
  });
  useQueryErrorToast(query);
  return query;
}

export function useUpdateChatbotSettings() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.update,
    onSuccess: (settings) => {
      cache.setQueryData(keys, settings);
      toast.success("Chatbot settings saved.");
    },
    onError: (error) =>
      toast.error(getErrorMessage(error) ?? "Unable to save chatbot settings."),
  });
}
