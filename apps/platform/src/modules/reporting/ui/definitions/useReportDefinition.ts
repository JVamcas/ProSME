"use client";
import { toast } from "@/shared/ui/Toast";
import { useQueryErrorToast } from "@/shared/ui/useQueryErrorToast";
import { getErrorMessage } from "@/lib/client-http";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientReportDefinitionService as client } from "../../ClientReportDefinitionService";
import type {
  ReportListInput,
  ReportTemplateInput,
} from "../../api/ReportManagementSchemas";

const keys = ["report-definition"];
export function useReportDatasets() {
  const query = useQuery({
    queryKey: [...keys, "datasets"],
    queryFn: ({ signal }) => client.datasets(signal),
  });
  useQueryErrorToast(query);
  return query;
}
export function useReportTemplates(input: ReportListInput) {
  const query = useQuery({
    queryKey: [...keys, "templates", input],
    queryFn: ({ signal }) => client.templates(input, signal),
  });
  useQueryErrorToast(query);
  return query;
}
export function useReportTemplate(id?: string) {
  const query = useQuery({
    queryKey: [...keys, "template", id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => client.template(id!, signal),
  });
  useQueryErrorToast(query);
  return query;
}
export function usePublishedReportTemplate(id: string, version: number) {
  const query = useQuery({
    queryKey: [...keys, "published", id, version],
    enabled: Boolean(id && version > 0),
    queryFn: ({ signal }) => client.published(id, version, signal),
  });
  useQueryErrorToast(query);
  return query;
}
export function useSaveReportTemplate(id?: string) {
  const cache = useQueryClient();
  return useMutation({
    onError: (error) =>
      toast.error(
        getErrorMessage(error) ?? "The operation could not be completed.",
      ),
    mutationFn: (input: ReportTemplateInput) => client.save(input, id),
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}
export function useValidateReportTemplate(id: string, publish: boolean) {
  const cache = useQueryClient();
  return useMutation({
    onError: (error) =>
      toast.error(
        getErrorMessage(error) ?? "The operation could not be completed.",
      ),
    mutationFn: (input: {
      rowVersion: number;
      values: Record<string, unknown>;
    }) => client.validate(id, input.rowVersion, input.values, publish),
    onSuccess: () => cache.invalidateQueries({ queryKey: keys }),
  });
}
