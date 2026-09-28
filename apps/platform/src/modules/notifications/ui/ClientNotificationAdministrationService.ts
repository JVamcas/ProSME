"use client";

import { patchData, postData, requestData } from "@/lib/client-http";
import type {
  NotificationCatalogDetail,
  NotificationCatalogSummary,
  NotificationCatalogUpdate,
  NotificationDeliveryPage,
  NotificationDeliveryQuery,
  NotificationEventRuleDetail,
  NotificationEventRuleListQuery,
  NotificationEventRuleSummary,
  NotificationEventRuleUpdate,
  NotificationOperationalSummary,
} from "../api/NotificationAdministrationSchemas";

const root = "/api/admin/notifications";
const keyPath = (segment: string, key: string) =>
  `${root}/${segment}/${encodeURIComponent(key)}`;

function listCatalogs() {
  return requestData<NotificationCatalogSummary[]>(`${root}/event-catalogs`);
}

function getCatalog(key: string) {
  return requestData<NotificationCatalogDetail>(keyPath("event-catalogs", key));
}

function updateCatalog(key: string, input: NotificationCatalogUpdate) {
  return patchData<NotificationCatalogDetail, NotificationCatalogUpdate>(
    keyPath("event-catalogs", key),
    input,
  );
}

function listRules(query: NotificationEventRuleListQuery) {
  const search = new URLSearchParams();
  if (query.catalogKey) search.set("catalogKey", query.catalogKey);
  if (query.search) search.set("search", query.search);
  const suffix = search.size ? `?${search}` : "";
  return requestData<NotificationEventRuleSummary[]>(`${root}/event-rules${suffix}`);
}

function getRule(key: string) {
  return requestData<NotificationEventRuleDetail>(keyPath("event-rules", key));
}

function updateRule(key: string, input: NotificationEventRuleUpdate) {
  return patchData<NotificationEventRuleDetail, NotificationEventRuleUpdate>(
    keyPath("event-rules", key),
    input,
  );
}

function listDeliveries(query: NotificationDeliveryQuery) {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return requestData<NotificationDeliveryPage>(`${root}/deliveries?${search}`);
}

function retryDelivery(deliveryId: string, reason: string) {
  return postData<{ outcome: string }, { reason: string }>(
    `${root}/deliveries/${encodeURIComponent(deliveryId)}/retry`,
    { reason },
  );
}

function getSummary() {
  return requestData<NotificationOperationalSummary>(`${root}/summary`);
}

export const clientNotificationAdministrationService = {
  getCatalog,
  getRule,
  getSummary,
  listCatalogs,
  listDeliveries,
  listRules,
  retryDelivery,
  updateCatalog,
  updateRule,
};
