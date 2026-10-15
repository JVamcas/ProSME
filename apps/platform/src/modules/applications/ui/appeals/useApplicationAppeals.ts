"use client";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { clientApplicationAppealService as client } from "../../ClientApplicationAppealService";
import type { AppealCursor } from "../../domain/ApplicationAppeal";
import { toast } from "@/shared/ui/Toast";
import { getErrorMessage } from "@/lib/client-http";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
const keys = ["application-appeals"] as const;
export function useSubmitApplicationAppeal() {
  return useMutation({ mutationFn: client.submit });
}
export function useApplicationAppeals() {
  const query = useInfiniteQuery({
    queryKey: [...keys, "list"],
    initialPageParam: undefined as AppealCursor | undefined,
    queryFn: ({ pageParam, signal }) => client.list(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  useQueryErrorToast(query);
  return query;
}
export function useApplicationAppeal(id: string) {
  const query = useQuery({
    queryKey: [...keys, "detail", id],
    queryFn: ({ signal }) => client.detail(id, signal),
  });
  useQueryErrorToast(query);
  return query;
}
export function useAppealAssignees() {
  const query = useQuery({
    queryKey: [...keys, "assignees"],
    queryFn: ({ signal }) => client.assignees(signal),
  });
  useQueryErrorToast(query);
  return query;
}
function useAppealMutationOptions() {
  const cache = useQueryClient();
  return {
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
    onError: (error: unknown) =>
      toast.error(getErrorMessage(error) ?? "Unable to update appeal."),
  };
}
export function useAssignApplicationAppeal() {
  const options = useAppealMutationOptions();
  return useMutation({ mutationFn: client.assign, ...options });
}
export function useResolveApplicationAppeal() {
  const options = useAppealMutationOptions();
  return useMutation({ mutationFn: client.resolve, ...options });
}
