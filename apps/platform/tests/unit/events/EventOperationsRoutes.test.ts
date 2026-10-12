import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
const fixture = vi.hoisted(() => ({
  user: null as AuthenticatedUser | null,
  transaction: vi.fn(),
  readPage: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/content/infrastructure/PayloadEventRepository", () => ({
  readOperationsEventPage: fixture.readPage,
}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: () => fixture.user,
}));
vi.mock("@/modules/content/infrastructure/EventRegistrationRepository", () => ({
  eventRegistrationTransaction: fixture.transaction,
}));
vi.mock(
  "@/modules/content/infrastructure/EventOperationsRepository",
  () => ({}),
);
vi.mock(
  "@/modules/notifications/infrastructure/EventEmailDeliveryRepository",
  () => ({}),
);
import { getOperationsEventPage } from "@/modules/content/application/ServerEventOperationsService";
import { GET as overview } from "@/app/api/admin/events/[eventId]/overview/route";
import { GET as participants } from "@/app/api/admin/events/[eventId]/participants/route";
import { GET as delivery } from "@/app/api/admin/events/[eventId]/delivery/route";
import { PUT as settings } from "@/app/api/admin/events/[eventId]/settings/route";
const context = { params: Promise.resolve({ eventId: "42" }) };
function actor(grants: string[]) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    status: "active",
    capabilities: new Set(grants),
  } as unknown as AuthenticatedUser;
}
beforeEach(() => {
  fixture.user = null;
  vi.clearAllMocks();
});
describe("Protected Operations event routes", () => {
  it.each([overview, participants, delivery])(
    "requires authentication before any repository read",
    async (route) => {
      const response = await route(
        new Request("https://example.test/api/admin/events/42"),
        context,
      );
      expect(response.status).toBe(401);
      expect(fixture.transaction).not.toHaveBeenCalled();
    },
  );
  it("requires the participant grant independently of delivery access", async () => {
    fixture.user = actor([permissionCodes.eventEmailDeliveryReadAll]);
    expect(
      (
        await participants(
          new Request("https://example.test/api/admin/events/42/participants"),
          context,
        )
      ).status,
    ).toBe(403);
    expect(fixture.transaction).not.toHaveBeenCalled();
  });
  it("requires the delivery grant independently of participant access", async () => {
    fixture.user = actor([permissionCodes.eventRegistrationsReadAll]);
    expect(
      (
        await delivery(
          new Request("https://example.test/api/admin/events/42/delivery"),
          context,
        )
      ).status,
    ).toBe(403);
  });
  it("requires update permission independently of settings read", async () => {
    fixture.user = actor([permissionCodes.eventRegistrationSettingsReadAll]);
    const request = new Request(
      "https://example.test/api/admin/events/42/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          opensAt: null,
          closesAt: null,
          confirmationEnabled: true,
          reminderEnabled: true,
          reminderHours: 24,
        }),
      },
    );
    expect((await settings(request, context)).status).toBe(403);
    expect(fixture.transaction).not.toHaveBeenCalled();
  });
  it("validates transport pagination before repository access", async () => {
    fixture.user = actor([permissionCodes.eventRegistrationsReadAll]);
    expect(
      (
        await participants(
          new Request(
            "https://example.test/api/admin/events/42/participants?page=0",
          ),
          context,
        )
      ).status,
    ).toBe(400);
    expect(fixture.transaction).not.toHaveBeenCalled();
  });
});

describe("Operations event list authorization", () => {
  it("denies unauthenticated, ungranted and disabled users before reading content", async () => {
    const disabled: AuthenticatedUser = {
      ...actor([permissionCodes.eventRegistrationsReadAll]),
      status: "disabled",
    };
    for (const user of [null, actor([]), disabled]) {
      await expect(getOperationsEventPage(user, {})).rejects.toThrow();
    }
    expect(fixture.readPage).not.toHaveBeenCalled();
  });

  it.each([
    permissionCodes.eventRegistrationsReadAll,
    permissionCodes.eventRegistrationSettingsReadAll,
    permissionCodes.eventEmailDeliveryReadAll,
  ])("allows the existing scoped permission %s", async (permission) => {
    fixture.readPage.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 20,
    });
    expect(
      await getOperationsEventPage(actor([permission]), { page: 2 }),
    ).toMatchObject({ page: 2 });
    expect(fixture.readPage).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("rejects invalid pagination before the content query", async () => {
    await expect(
      getOperationsEventPage(
        actor([permissionCodes.eventRegistrationsReadAll]),
        { page: 0 },
      ),
    ).rejects.toThrow();
    expect(fixture.readPage).not.toHaveBeenCalled();
  });
});
