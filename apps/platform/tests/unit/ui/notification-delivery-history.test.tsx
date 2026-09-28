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

async function renderHistory() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<NotificationDeliveryHistory />));
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
});
