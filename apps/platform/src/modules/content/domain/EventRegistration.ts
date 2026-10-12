export type EventRegistrationSettings = {
  eventId: number;
  enabled: boolean;
  opensAt: string | null;
  closesAt: string | null;
  confirmationEnabled: boolean;
  reminderEnabled: boolean;
  reminderHours: number;
};

export type PublishedRegistrationEvent = {
  published?: boolean;
  id: number;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  location: string;
};

export type EventParticipant = {
  id: string;
  fullName: string;
  email: string;
  organisation: string | null;
  registeredAt: string;
};

export type EventRegistrationReceipt = {
  accepted: true;
};
