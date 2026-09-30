// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  deliveries: {} as Record<string, unknown>,
}));

vi.mock("@/modules/notifications/ui/useNotificationAdministration", () => ({
  useNotificationDeliveries: () => hooks.deliveries,
  useRetryNotificationDelivery: () => ({
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

import { NotificationDeliveryHistory } from "@/modules/notifications/ui/NotificationDeliveryHistory";

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

async function renderHistory(canRetry = false) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <NotificationDeliveryHistory canRetry={canRetry} />,
  ));
  return { container, root };
}

describe("notification delivery history states", () => {
  it("shows a clear loading state", async () => {
    hooks.deliveries = { error: null, isPending: true };
    const { container, root } = await renderHistory();
    expect(container.textContent).toContain("Loading delivery history");
    await act(async () => root.unmount());
  });

  it("shows a clear error state", async () => {
    hooks.deliveries = {
      error: new Error("History is unavailable."),
      isPending: false,
    };
    const { container, root } = await renderHistory();
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain("History is unavailable.");
    await act(async () => root.unmount());
  });

  it("shows an empty filtered state and pagination boundaries", async () => {
    hooks.deliveries = {
      data: { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 },
      error: null,
      isFetching: false,
      isPending: false,
    };
    const { container, root } = await renderHistory();
    expect(container.textContent).toContain("No deliveries match");
    expect(container.textContent).toContain("Page 1 of 1");
    await act(async () => root.unmount());
  });

  it("offers an authorized redrive action for dead-letter deliveries", async () => {
    hooks.deliveries = {
      data: {
        items: [{
          applicationReference: "SME Fund-2026-005",
          attemptCount: 5,
          channelCode: "EMAIL",
          createdAt: "2026-09-30T12:00:00.000Z",
          deliveryId: "81000000-0000-4000-8000-000000000001",
          eventKey: "application.submitted",
          failureCode: "NOTIFICATION_RETRY_EXHAUSTED",
          nextAttemptAt: "2026-09-30T12:15:00.000Z",
          recipientEmail: "applicant@example.test",
          recipientName: "Applicant",
          sentAt: null,
          status: "DEAD_LETTER",
          templateVersionNumber: 1,
          updatedAt: "2026-09-30T12:15:00.000Z",
        }],
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
      },
      error: null,
      isFetching: false,
      isPending: false,
    };

    const { container, root } = await renderHistory(true);

    expect(container.textContent).toContain("DEAD_LETTER");
    expect(container.textContent).toContain("5 attempts");
    expect(
      [...container.querySelectorAll("button")]
        .some((button) => button.textContent?.includes("Retry")),
    ).toBe(true);
    await act(async () => root.unmount());
  });
});
