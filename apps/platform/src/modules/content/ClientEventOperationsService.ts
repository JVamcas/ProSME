"use client";

import { requestData } from "@/lib/client-http";
import type { EventSettingsInput } from "./api/EventRegistrationSchemas";
import type {
  EventOperationsOverview,
  EventOperationsPage,
  EventParticipantStatus,
  EventDeliveryRow,
} from "./api/EventOperationsTypes";

export const clientEventOperationsService = {
  overview: (id: number) =>
    requestData<EventOperationsOverview>(`/api/admin/events/${id}/overview`),
  participants: (id: number, page: number, search: string) =>
    requestData<EventOperationsPage<EventParticipantStatus>>(
      `/api/admin/events/${id}/participants?${new URLSearchParams({ page: String(page), pageSize: "4", search })}`,
    ),
  delivery: (id: number, page: number) =>
    requestData<EventOperationsPage<EventDeliveryRow>>(
      `/api/admin/events/${id}/delivery?page=${page}&pageSize=10`,
    ),
  settings: (id: number, input: EventSettingsInput) =>
    requestData<{ eventId: number }>(`/api/admin/events/${id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
};
