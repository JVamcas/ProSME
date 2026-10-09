"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  NotificationCatalogUpdate,
  NotificationDeliveryQuery,
  NotificationEventRuleUpdate,
  NotificationEventRuleListQuery,
} from "../api/NotificationAdministrationSchemas";
import { clientNotificationAdministrationService as service } from "./ClientNotificationAdministrationService";

const keys = {
  catalogs: ["admin", "notifications", "catalogs"] as const,
  catalog: (key: string) =>
    ["admin", "notifications", "catalogs", key] as const,
  rules: ["admin", "notifications", "rules"] as const,
  ruleList: (query: NotificationEventRuleListQuery) =>
    ["admin", "notifications", "rules", query] as const,
  rule: (key: string, reportId?: string) =>
    ["admin", "notifications", "rules", key, reportId] as const,
  deliveries: (query: NotificationDeliveryQuery) =>
    ["admin", "notifications", "deliveries", query] as const,
  summary: ["admin", "notifications", "summary"] as const,
};

export function useNotificationCatalogs() {
  return useQuery({ queryFn: service.listCatalogs, queryKey: keys.catalogs });
}

export function useNotificationCatalog(key: string) {
  return useQuery({
    queryFn: () => service.getCatalog(key),
    queryKey: keys.catalog(key),
  });
}

export function useUpdateNotificationCatalog(key: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationCatalogUpdate) =>
      service.updateCatalog(key, input),
    onSuccess: (catalog) => {
      client.setQueryData(keys.catalog(key), catalog);
      void client.invalidateQueries({ queryKey: keys.catalogs });
    },
  });
}

export function useNotificationRules(
  query: NotificationEventRuleListQuery = {},
) {
  return useQuery({
    queryFn: () => service.listRules(query),
    queryKey: keys.ruleList(query),
  });
}

export function useNotificationRule(
  key: string,
  enabled = true,
  reportId?: string,
) {
  return useQuery({
    enabled,
    queryFn: () => service.getRule(key, reportId),
    queryKey: keys.rule(key, reportId),
  });
}

export function useUpdateNotificationRule(key: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationEventRuleUpdate) =>
      service.updateRule(key, input),
    onSuccess: (rule) => {
      client.setQueryData(keys.rule(key), rule);
      void client.invalidateQueries({ queryKey: keys.rules });
    },
  });
}

export function useUpdateNotificationRuleFromList() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventKey,
      reportId,
      input,
    }: {
      eventKey: string;
      reportId?: string;
      input: NotificationEventRuleUpdate;
    }) => service.updateRule(eventKey, input, reportId),
    onSuccess: (rule) => {
      client.setQueryData(
        keys.rule(rule.eventKey, rule.reportId ?? undefined),
        rule,
      );
      void client.invalidateQueries({
        queryKey: ["reports", rule.reportId, "delivery"],
      });
      void client.invalidateQueries({ queryKey: keys.rules });
    },
  });
}

export function useNotificationDeliveries(
  query: NotificationDeliveryQuery,
  reportId?: string,
) {
  return useQuery({
    queryFn: () => service.listDeliveries(query, reportId),
    queryKey: [...keys.deliveries(query), reportId],
  });
}

export function useRetryNotificationDelivery(reportId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      deliveryId,
      reason,
    }: {
      deliveryId: string;
      reason: string;
    }) => service.retryDelivery(deliveryId, reason, reportId),
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["admin", "notifications", "deliveries"],
      });
      void client.invalidateQueries({ queryKey: keys.summary });
    },
  });
}

export function useNotificationSummary() {
  return useQuery({
    queryFn: service.getSummary,
    queryKey: keys.summary,
    refetchInterval: 30_000,
  });
}
