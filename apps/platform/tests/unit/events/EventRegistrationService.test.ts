vi.mock(
  "@/modules/notifications/infrastructure/EventEmailDeliveryRepository",
  () => ({
    reconcileEventEmailIntents: vi.fn(),
  }),
);
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";

const fixture = vi.hoisted(() => ({
  transaction: {},
  event: vi.fn(),
  settings: vi.fn(),
  insert: vi.fn(),
  audit: vi.fn(),
  capture: vi.fn(),
  save: vi.fn(),
  list: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/content/infrastructure/EventRegistrationRepository", () => ({
  eventRegistrationTransaction: (callback: (transaction: unknown) => unknown) =>
    callback(fixture.transaction),
  readRegistrationEvent: fixture.event,
  readRegistrationSettings: fixture.settings,
  insertEventParticipant: fixture.insert,
  auditEventRegistration: fixture.audit,
  saveRegistrationSettings: fixture.save,
  listEventParticipants: fixture.list,
}));
vi.mock(
  "@/modules/notifications/infrastructure/EventNotificationIntentRepository",
  () => ({
    captureEventRegistrationIntents: fixture.capture,
  }),
);

import {
  registerForEvent,
  getEventParticipants,
  getEventRegistrationSettings,
  updateEventRegistrationSettings,
} from "@/modules/content/application/ServerEventRegistrationService";

const input = {
  fullName: "Sample",
  email: "sample@example.test",
  emailConsent: true,
};
const settings = {
  eventId: 42,
  enabled: true,
  opensAt: null,
  closesAt: null,
  confirmationEnabled: true,
  reminderEnabled: true,
  reminderHours: 24,
};
function actor(grants: string[], status = "active") {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    status,
    capabilities: new Set(grants),
  } as unknown as AuthenticatedUser;
}

beforeEach(() => {
  vi.clearAllMocks();
  fixture.event.mockResolvedValue({ id: 42, startsAt: "2099-01-01T10:00:00Z" });
  fixture.settings.mockResolvedValue(settings);
  fixture.insert.mockResolvedValue({ id: "registration-id" });
  fixture.list.mockResolvedValue({ items: [], total: 0 });
});

describe("Event registration service", () => {
  it("writes registration, audit and intent using one transaction", async () => {
    await expect(registerForEvent(42, input)).resolves.toEqual({
      accepted: true,
    });
    expect(fixture.insert.mock.calls[0][0]).toBe(fixture.transaction);
    expect(fixture.audit).toHaveBeenCalledWith(
      fixture.transaction,
      42,
      "registration-id",
      "REGISTERED",
      null,
    );
    expect(fixture.capture.mock.calls[0][0]).toBe(fixture.transaction);
  });

  it("replays without another audit or notification", async () => {
    fixture.insert.mockResolvedValue(null);
    await expect(registerForEvent(42, input)).resolves.toEqual({
      accepted: true,
    });
    expect(fixture.audit).not.toHaveBeenCalled();
    expect(fixture.capture).not.toHaveBeenCalled();
  });

  it("does not register an unpublished event", async () => {
    fixture.event.mockResolvedValue(null);
    await expect(registerForEvent(42, input)).rejects.toThrow(
      "published event not found",
    );
    expect(fixture.settings).not.toHaveBeenCalled();
    expect(fixture.insert).not.toHaveBeenCalled();
  });

  it("does not write to a closed event", async () => {
    fixture.settings.mockResolvedValue({ ...settings, enabled: false });
    await expect(registerForEvent(42, input)).rejects.toThrow(
      "Registration is closed",
    );
    expect(fixture.insert).not.toHaveBeenCalled();
  });

  it("rejects missing consent before persistence", async () => {
    await expect(
      registerForEvent(42, { ...input, emailConsent: false }),
    ).rejects.toThrow();
    expect(fixture.event).not.toHaveBeenCalled();
  });

  it("propagates notification failure to roll back the transaction", async () => {
    fixture.capture.mockRejectedValueOnce(new Error("intent failed"));
    await expect(registerForEvent(42, input)).rejects.toThrow("intent failed");
  });

  it.each([
    null,
    actor([]),
    actor([permissionCodes.eventRegistrationsReadAll], "disabled"),
  ])("denies participant reads before querying", async (user) => {
    await expect(getEventParticipants(user, 42, {})).rejects.toThrow();
    expect(fixture.event).not.toHaveBeenCalled();
  });

  it("keeps participant and settings grants distinct", async () => {
    const user = actor([permissionCodes.eventRegistrationSettingsReadAll]);
    await expect(getEventRegistrationSettings(user, 42)).resolves.toMatchObject(
      { settings },
    );
    await expect(getEventParticipants(user, 42, {})).rejects.toThrow(
      "Missing required capability",
    );
    await expect(updateEventRegistrationSettings(user, 42, {})).rejects.toThrow(
      "Missing required capability",
    );
  });

  it("scopes participant reads to the requested existing event", async () => {
    const user = actor([permissionCodes.eventRegistrationsReadAll]);
    await getEventParticipants(user, 42, { page: 3, search: "Sample" });
    expect(fixture.list).toHaveBeenCalledWith(fixture.transaction, 42, {
      page: 3,
      pageSize: 20,
      search: "Sample",
    });
    fixture.event.mockResolvedValue(null);
    await expect(getEventParticipants(user, 99, {})).rejects.toThrow(
      "event not found",
    );
  });

  it("audits settings updates with the saved event ID and actor", async () => {
    const user = actor([permissionCodes.eventRegistrationSettingsUpdateAll]);
    const values = { ...settings };
    Reflect.deleteProperty(values, "eventId");
    await updateEventRegistrationSettings(user, 42, values);
    expect(fixture.save).toHaveBeenCalledWith(
      fixture.transaction,
      42,
      values,
      user.id,
    );
    expect(fixture.audit).toHaveBeenCalledWith(
      fixture.transaction,
      42,
      null,
      "SETTINGS_UPDATED",
      user.id,
      values,
    );
  });
});
