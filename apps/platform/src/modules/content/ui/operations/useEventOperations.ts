"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
import { toast } from "@/shared/ui/Toast";
import { getErrorMessage } from "@/lib/client-http";
import { clientEventOperationsService as client } from "../../ClientEventOperationsService";
import type { EventSettingsInput } from "../../api/EventRegistrationSchemas";

export function useEventOverview(id: number) {
  const query = useQuery({
    queryKey: ["event-operations", id, "overview"],
    queryFn: () => client.overview(id),
    refetchInterval: 30000,
  });
  useQueryErrorToast(query);
  return query;
}
export function useEventParticipants(
  id: number,
  page: number,
  search: string,
  enabled: boolean,
) {
  const query = useQuery({
    queryKey: ["event-operations", id, "participants", page, search],
    queryFn: () => client.participants(id, page, search),
    enabled,
    refetchInterval: 30000,
  });
  useQueryErrorToast(query);
  return query;
}
export function useEventDelivery(id: number, page: number, enabled: boolean) {
  const query = useQuery({
    queryKey: ["event-operations", id, "delivery", page],
    queryFn: () => client.delivery(id, page),
    enabled,
    refetchInterval: 30000,
  });
  useQueryErrorToast(query);
  return query;
}
export function useEventSettings(id: number) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: EventSettingsInput) => client.settings(id, input),
    onSuccess: () => {
      toast.success("Event settings saved.");
      return cache.invalidateQueries({ queryKey: ["event-operations", id] });
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(error) ?? "Event settings could not be saved.",
      ),
  });
}
