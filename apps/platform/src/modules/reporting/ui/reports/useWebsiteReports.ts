"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientWebsiteReportService as service } from "../../ClientWebsiteReportService";
import type {
  WebsiteReportListInput,
  WebsiteScheduleUpdateInput,
} from "../../api/WebsiteReportSchemas";

const reportKeys = {
  history: ["reporting", "website-reports"] as const,
  settings: ["reporting", "website-schedules"] as const,
};

export function useWebsiteReports(input: WebsiteReportListInput) {
  return useQuery({
    queryKey: [...reportKeys.history, input],
    queryFn: ({ signal }) => service.list(input, signal),
    refetchInterval: 30_000,
  });
}

export function useWebsiteReport(id: string) {
  return useQuery({
    queryKey: [...reportKeys.history, id],
    queryFn: ({ signal }) => service.detail(id, signal),
    refetchInterval: (query) => {
      const report = query.state.data;
      const awaitingDelivery =
        report?.deliveryState &&
        ["PENDING", "PROCESSING", "PARTIALLY_SENT"].includes(
          report.deliveryState,
        );
      return report?.state === "PENDING" || awaitingDelivery ? 30_000 : false;
    },
  });
}

export function useWebsiteReportSettings() {
  return useQuery({
    queryKey: reportKeys.settings,
    queryFn: ({ signal }) => service.settings(signal),
  });
}

export function useUpdateWebsiteReportSchedule(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: WebsiteScheduleUpdateInput) =>
      service.update(id, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: reportKeys.settings }),
        client.invalidateQueries({ queryKey: reportKeys.history }),
      ]);
    },
  });
}
