"use client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/client-http";
import { toast } from "@/shared/ui/Toast";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
import { clientChatbotService as client } from "../../ClientChatbotService";

const keys = ["chatbot-knowledge"] as const;
const mutationError = (error: unknown) =>
  toast.error(getErrorMessage(error) ?? "Unable to save chatbot knowledge.");

export function useChatbotKnowledgeWorkspace() {
  const query = useQuery({
    queryKey: [...keys, "workspace"],
    queryFn: ({ signal }) => client.workspace(signal),
  });
  useQueryErrorToast(query);
  return query;
}

export function useChatbotKnowledgeSources(kind: "funding-call" | "faq") {
  const query = useInfiniteQuery({
    queryKey: [...keys, "sources", kind],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => client.sources(kind, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  useQueryErrorToast(query);
  return query;
}

export function useChatbotKnowledgeRelease(id: string | null) {
  const query = useQuery({
    queryKey: [...keys, "release", id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => client.detail(id!, signal),
  });
  useQueryErrorToast(query);
  return query;
}

export function usePrepareChatbotKnowledge() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.prepare,
    onError: mutationError,
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}

export function useApproveChatbotKnowledge() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.approve,
    onError: mutationError,
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}

export function usePublishChatbotKnowledge() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.publish,
    onError: mutationError,
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}

export function useWithdrawChatbotKnowledge() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: client.withdraw,
    onError: mutationError,
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}
