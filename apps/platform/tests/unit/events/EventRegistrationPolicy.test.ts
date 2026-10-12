import { describe, expect, it } from "vitest";
import {
  eventRegistrationSchema,
  eventRegistrationSettingsSchema,
} from "@/modules/content/api/EventRegistrationSchemas";
import { isEventRegistrationOpen } from "@/modules/content/domain/EventRegistrationPolicy";
import {
  eventLocalSchedule,
  eventScheduleInstant,
} from "@/modules/content/domain/EventSchedule";
import {
  validateEventRecordingUrl,
  validateEventTimezone,
} from "@/modules/content/domain/EventMetadata";

const event = {
  id: 42,
  title: "Synthetic session",
  slug: "synthetic-session",
  startsAt: "2030-11-12T08:00:00Z",
  endsAt: null,
  timezone: "Africa/Windhoek",
  location: "Windhoek",
};
const settings = {
  eventId: 42,
  enabled: true,
  opensAt: "2030-11-10T08:00:00Z",
  closesAt: "2030-11-12T07:00:00Z",
  confirmationEnabled: true,
  reminderEnabled: true,
  reminderHours: 24,
};

describe("Event registration policies and validation", () => {
  it.each([
    ["2030-11-10T07:59:59Z", false],
    ["2030-11-10T08:00:00Z", true],
    ["2030-11-12T06:59:59Z", true],
    ["2030-11-12T07:00:00Z", false],
  ])("checks opening and closing at %s", (now, expected) => {
    expect(isEventRegistrationOpen(event, settings, new Date(now))).toBe(
      expected,
    );
  });

  it("closes at the event start even without a closing date", () => {
    expect(
      isEventRegistrationOpen(
        event,
        { ...settings, closesAt: null },
        new Date(event.startsAt),
      ),
    ).toBe(false);
  });

  it("denies absent or disabled settings", () => {
    expect(
      isEventRegistrationOpen(event, null, new Date(settings.opensAt)),
    ).toBe(false);
    expect(
      isEventRegistrationOpen(
        event,
        { ...settings, enabled: false },
        new Date(settings.opensAt),
      ),
    ).toBe(false);
  });

  it("requires consent and normalizes duplicate identity", () => {
    const input = {
      fullName: "  Sample Participant  ",
      email: "PERSON@Example.test",
      emailConsent: true,
    };
    expect(eventRegistrationSchema.parse(input)).toEqual({
      fullName: "Sample Participant",
      email: "person@example.test",
      organisation: "",
      emailConsent: true,
    });
    expect(
      eventRegistrationSchema.safeParse({ ...input, emailConsent: false })
        .success,
    ).toBe(false);
    expect(
      eventRegistrationSchema.safeParse({ ...input, extra: "unexpected" })
        .success,
    ).toBe(false);
    expect(
      eventRegistrationSchema.safeParse({ ...input, fullName: " " }).success,
    ).toBe(false);
    expect(
      eventRegistrationSchema.safeParse({ ...input, email: "invalid" }).success,
    ).toBe(false);
  });

  it("rejects reversed windows and invalid reminder timing", () => {
    const input = { ...settings };
    Reflect.deleteProperty(input, "eventId");
    expect(eventRegistrationSettingsSchema.safeParse(input).success).toBe(true);
    expect(
      eventRegistrationSettingsSchema.safeParse({
        ...input,
        closesAt: input.opensAt,
      }).success,
    ).toBe(false);
    expect(
      eventRegistrationSettingsSchema.safeParse({ ...input, reminderHours: 0 })
        .success,
    ).toBe(false);
  });

  it("converts event-local date/time independently of the host timezone", () => {
    expect(eventScheduleInstant("2030-11-12", "10:00", "Africa/Windhoek")).toBe(
      "2030-11-12T08:00:00.000Z",
    );
    expect(eventLocalSchedule(event.startsAt, "Africa/Windhoek")).toEqual({
      date: "2030-11-12",
      time: "10:00",
    });
    expect(
      eventScheduleInstant("2030-02-31", "10:00", "Africa/Windhoek"),
    ).toBeNull();
    expect(
      eventScheduleInstant("2030-03-10", "02:30", "America/New_York"),
    ).toBeNull();
  });

  it("validates recording links and timezone metadata", () => {
    expect(validateEventRecordingUrl("https://example.test/recording")).toBe(
      true,
    );
    expect(validateEventRecordingUrl("javascript:alert(1)")).not.toBe(true);
    expect(
      validateEventRecordingUrl("https://user:password@example.test"),
    ).not.toBe(true);
    expect(validateEventTimezone("Africa/Windhoek")).toBe(true);
    expect(validateEventTimezone("invented/timezone")).not.toBe(true);
  });
});
