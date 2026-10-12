import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  page: vi.fn(),
  event: vi.fn(),
  availability: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (read: unknown) => read }));
vi.mock("@/modules/content/application/ServerContentReadService", () => ({
  getContentReadMode: async () => ({ draft: false, where: {} }),
}));
vi.mock("@/modules/content/infrastructure/PayloadEventRepository", () => ({
  readEventContentPage: fixture.page,
  readEventBySlug: fixture.event,
}));
vi.mock("@/modules/content/infrastructure/PublishedContentRepository", () => ({
  readPublishedEvent: fixture.event,
}));
vi.mock("@/modules/content/infrastructure/EventRecordingRepository", () => ({
  readRecordingCategories: vi.fn(),
}));
vi.mock("@/modules/content/infrastructure/EventRegistrationAvailabilityRepository", () => ({
  readEventRegistrationAvailability: fixture.availability,
}));

import {
  getEventBySlug,
  getEventContentPage,
} from "@/modules/content/application/ServerEventContentService";

const event = {
  id: 1,
  title: "Information session",
  slug: "information-session",
  summary: "A public event",
  startsAt: "2030-11-12T08:00:00Z",
};
const settings = {
  id: 1,
  startsAt: event.startsAt,
  published: true,
  enabled: true,
  opensAt: null,
  closesAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-11-10T08:00:00Z"));
  fixture.event.mockResolvedValue(event);
  fixture.availability.mockResolvedValue([settings]);
});
afterEach(() => vi.useRealTimers());

describe("public event registration availability", () => {
  it.each([
    { name: "missing settings", row: { ...settings, enabled: null } },
    { name: "disabled registration", row: { ...settings, enabled: false } },
    { name: "unpublished event", row: { ...settings, published: false } },
    { name: "future opening", row: { ...settings, opensAt: "2030-11-11T08:00:00Z" } },
    { name: "closed window", row: { ...settings, closesAt: "2030-11-10T08:00:00Z" } },
    { name: "started event", row: { ...settings, startsAt: "2030-11-10T08:00:00Z" } },
  ])("disables registration for $name", async ({ row }) => {
    fixture.availability.mockResolvedValue([row]);
    expect(await getEventBySlug(event.slug)).toMatchObject({ registrationAvailable: false });
  });

  it("enables registration inside the server policy's open window", async () => {
    expect(await getEventBySlug(event.slug)).toMatchObject({ registrationAvailable: true });
  });

  it("reads availability once for all events on a bounded page", async () => {
    fixture.page.mockResolvedValue({
      docs: [event, { ...event, id: 2 }],
      totalDocs: 2,
      page: 1,
      totalPages: 1,
    });
    const result = await getEventContentPage({ period: "upcoming" });
    expect(fixture.availability).toHaveBeenCalledExactlyOnceWith([1, 2]);
    expect(result.items.map((item) => item.registrationAvailable)).toEqual([true, false]);
  });
});
