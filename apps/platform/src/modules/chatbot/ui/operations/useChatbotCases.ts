"use client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  clientChatbotCaseService as client,
  type ChatbotCaseCursor,
  type ChatbotCaseScope,
} from "../../ClientChatbotCaseService";
import { getErrorMessage } from "@/lib/client-http";
import { toast } from "@/shared/ui/Toast";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
const keys = ["chatbot-cases"] as const;
export function useChatbotCases(scope?: ChatbotCaseScope) {
  const query = useInfiniteQuery({
    queryKey: [...keys, "list", scope ?? "authorized"],
    initialPageParam: undefined as ChatbotCaseCursor | undefined,
    queryFn: ({ pageParam, signal }) => client.list(pageParam, signal, scope),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  useQueryErrorToast(query);
  return query;
}
export function useChatbotCase(id: string) {
  const query = useQuery({
    queryKey: [...keys, id],
    queryFn: ({ signal }) => client.detail(id, signal),
  });
  useQueryErrorToast(query);
  return query;
}
export function useChatbotCaseAssignees(enabled: boolean) {
  const query = useQuery({
    queryKey: [...keys, "assignees"],
    queryFn: ({ signal }) => client.assignees(signal),
    enabled,
  });
  useQueryErrorToast(query);
  return query;
}
const onError = (error: unknown) =>
  toast.error(getErrorMessage(error) ?? "Unable to update support case.");
export function useUpdateChatbotCase() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.update,
    onError,
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}
export function useAssignChatbotCase() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.assign,
    onError,
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}
