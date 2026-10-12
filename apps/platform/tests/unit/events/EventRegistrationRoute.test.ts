import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock(
  "@/modules/content/application/ServerEventRegistrationService",
  () => ({ registerForEvent: fixture.register }),
);

import { POST } from "@/app/api/public/events/[eventId]/registrations/route";

function request(body: unknown) {
  return new Request("http://localhost/api/public/events/42/registrations", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

const context = { params: Promise.resolve({ eventId: "42" }) };

beforeEach(() => {
  vi.clearAllMocks();
  fixture.register.mockResolvedValue({ accepted: true });
});

describe("public event registration route", () => {
  it("registers a validated visitor for the route event", async () => {
    const input = {
      email: "VISITOR@example.test",
      emailConsent: true,
      fullName: " Visitor Name ",
      organisation: "SME",
    };
    const response = await POST(request(input), context);

    expect(response.status).toBe(200);
    expect(fixture.register).toHaveBeenCalledWith("42", {
      email: "visitor@example.test",
      emailConsent: true,
      fullName: "Visitor Name",
      organisation: "SME",
    });
    await expect(response.json()).resolves.toMatchObject({
      data: { accepted: true },
    });
  });

  it("rejects unchecked consent before calling the service", async () => {
    const response = await POST(
      request({
        email: "visitor@example.test",
        emailConsent: false,
        fullName: "Visitor Name",
        organisation: "",
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(fixture.register).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        fields: { emailConsent: [expect.stringContaining("Agree")] },
      },
    });
  });
});
