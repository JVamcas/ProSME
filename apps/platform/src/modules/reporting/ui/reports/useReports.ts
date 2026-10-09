"use client";
import { useEffect } from "react";
import { toast } from "@/shared/ui/Toast";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
import { getErrorMessage } from "@/lib/client-http";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientReportService as client } from "../../ClientReportService";
import type {
  ConfiguredReportInput,
  ReportListInput,
  ManualReportRunInput,
} from "../../api/ReportManagementSchemas";

const keys = ["reports"];
export function useReports(input: ReportListInput) {
  const query = useQuery({
    queryKey: [...keys, "list", input],
    queryFn: ({ signal }) => client.list(input, signal),
  });
  useQueryErrorToast(query);
  return query;
}
export function useReport(id?: string) {
  const query = useQuery({
    queryKey: [...keys, id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => client.detail(id!, signal),
  });
  useQueryErrorToast(query);
  const defaultsError = query.data?.runDefaultsError;
  useEffect(() => {
    if (defaultsError) {
      toast.error(defaultsError);
    }
  }, [defaultsError]);
  return query;
}
export function useSaveReport(id?: string) {
  const cache = useQueryClient();
  return useMutation({
    onError: (error) =>
      toast.error(
        getErrorMessage(error) ?? "The operation could not be completed.",
      ),
    mutationFn: (input: ConfiguredReportInput) => client.save(input, id),
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}
export function useRunReport(id: string) {
  const cache = useQueryClient();
  return useMutation({
    onError: (error) =>
      toast.error(
        getErrorMessage(error) ?? "The operation could not be completed.",
      ),
    mutationFn: (input: ManualReportRunInput) => client.run(id, input),
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: [...keys, id, "runs"] }),
  });
}
export function useReportRuns(id: string, input: ReportListInput) {
  const query = useQuery({
    queryKey: [...keys, id, "runs", input],
    queryFn: ({ signal }) => client.runs(id, input, signal),
    refetchInterval: (query) =>
      query.state.data?.items.some(
        (run) => !["SUCCEEDED", "FAILED"].includes(run.status),
      )
        ? 5000
        : false,
  });
  useQueryErrorToast(query);
  return query;
}
export function useReportRunDetail(id: string, runId?: string) {
  const query = useQuery({
    queryKey: [...keys, id, "runs", runId],
    enabled: Boolean(runId),
    queryFn: ({ signal }) => client.runDetail(id, runId!, signal),
    refetchInterval: (query) =>
      query.state.data &&
      (!["SUCCEEDED", "FAILED"].includes(query.state.data.run.status) ||
        (query.state.data.run.status === "FAILED" &&
          !query.state.data.artifacts.some(
            (artifact) => artifact.kind === "ERROR",
          )))
        ? 5000
        : false,
  });
  useQueryErrorToast(query);
  const runError =
    query.data?.run.status === "FAILED" ? query.data.run.error : null;
  useEffect(() => {
    if (runError) {
      toast.error(runError);
    }
  }, [runError, runId]);
  return query;
}

export function useDownloadReportArtifact(reportId: string) {
  return useMutation({
    mutationFn: (input: { runId: string; artifactId: string }) =>
      client.download(reportId, input.runId, input.artifactId),
    onError: (error) =>
      toast.error(
        getErrorMessage(error) ?? "The report file could not be downloaded.",
      ),
  });
}
