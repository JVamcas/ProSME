import type {
  EventParticipant,
  EventRegistrationSettings,
  PublishedRegistrationEvent,
} from "../domain/EventRegistration";

export type EventDeliveryRow = {
  id: string;
  participant: string;
  kind: string;
  state: string;
  dueAt: string;
  sentAt: string | null;
  attempts: number;
  errorCode: string | null;
};
export type EventOperationsOverview = {
  event: PublishedRegistrationEvent;
  settings: EventRegistrationSettings | null;
  registered: number | null;
  confirmationsSent: number | null;
  remindersScheduled: number | null;
  deliveryIssues: number | null;
  permissions: {
    participants: boolean;
    settings: boolean;
    update: boolean;
    delivery: boolean;
  };
};
export type EventParticipantStatus = EventParticipant & {
  confirmation: string;
  reminder: string;
};
export type EventOperationsPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
