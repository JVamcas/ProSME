// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventOperationsOverview } from "@/modules/content/api/EventOperationsTypes";

vi.mock("@/modules/content/ui/operations/useEventOperations", () => ({
  useEventOverview: () => ({ data: undefined }),
}));
vi.mock("@/modules/content/ui/operations/EventParticipantsTable", () => ({
  EventParticipantsTable: () => <p>Participant table</p>,
  EventEmailDeliveryTable: () => <p>Email delivery table</p>,
}));
vi.mock("@/modules/content/ui/operations/EventSettingsForm", () => ({
  EventSettingsForm: () => <p>Settings form</p>,
}));
import { EventOperationsWorkspace } from "@/modules/content/ui/operations/EventOperationsWorkspace";
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});
const overview: EventOperationsOverview = {
  event: {
    id: 42,
    title: "Synthetic session",
    slug: "synthetic-session",
    startsAt: "2099-01-01T10:00:00Z",
    endsAt: null,
    timezone: "Africa/Windhoek",
    location: "Windhoek",
  },
  settings: null,
  registered: 5,
  confirmationsSent: 3,
  remindersScheduled: 5,
  deliveryIssues: 1,
  permissions: {
    participants: true,
    settings: true,
    update: true,
    delivery: true,
  },
};
async function render(data = overview) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<EventOperationsWorkspace initial={data} />),
  );
  return container;
}
describe("Operations event workspace with shared Tabs", () => {
  it("renders persisted cards, links and the three shared tabs", async () => {
    const view = await render();
    expect(view.textContent).toContain("Confirmations sent");
    expect(view.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(
      view.querySelector('a[href="/events/synthetic-session"]'),
    ).not.toBeNull();
    expect(
      view.querySelector('a[href="/cms/collections/events/42"]'),
    ).not.toBeNull();
    expect(view.textContent).toContain("24 hours before event");
    const manage = [...view.querySelectorAll("button")].find(
      (button) => button.textContent === "Manage registration",
    )!;
    await act(async () => manage.click());
    expect(
      view.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    ).toBe("Registration settings");
    expect(view.textContent).toContain("Settings form");
  });
  it("uses shared keyboard navigation between tabs", async () => {
    const view = await render();
    const first = view.querySelector<HTMLElement>('[role="tab"]')!;
    await act(async () => {
      first.focus();
      first.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(
      view.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    ).toBe("Registration settings");
  });
  it("hides participant and settings destinations without their grants", async () => {
    const view = await render({
      ...overview,
      settings: null,
      registered: null,
      permissions: {
        participants: false,
        settings: false,
        update: false,
        delivery: true,
      },
    });
    expect(view.querySelectorAll('[role="tab"]')).toHaveLength(1);
    expect(view.textContent).toContain("Email delivery table");
    expect(view.textContent).not.toContain("Participant table");
    expect(view.textContent).not.toContain("Manage registration");
  });
});
