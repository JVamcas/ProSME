"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/ui/Toast";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
import { getErrorMessage } from "@/lib/client-http";
import { clientReportAutomationService as client } from "../../ClientReportAutomationService";
import type { ReportScheduleInput } from "../../domain/ReportSchedule";

const key = (id: string, kind: string) => ["reports", id, kind];
const onError = (error: unknown) =>
  toast.error(getErrorMessage(error) ?? "The change could not be saved.");
export function useReportSchedules(id: string) {
  const query = useQuery({
    queryKey: key(id, "schedules"),
    queryFn: ({ signal }) => client.schedules(id, signal),
  });
  useQueryErrorToast(query);
  return query;
}
export function useSaveReportSchedule(id: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      scheduleId,
    }: {
      input: ReportScheduleInput;
      scheduleId?: string;
    }) => client.saveSchedule(id, input, scheduleId),
    onError,
    onSuccess: () => cache.invalidateQueries({ queryKey: ["reports", id] }),
  });
}
export function useReportDelivery(id: string) {
  const query = useQuery({
    queryKey: key(id, "delivery"),
    queryFn: ({ signal }) => client.delivery(id, signal),
  });
  useQueryErrorToast(query);
  return query;
}
