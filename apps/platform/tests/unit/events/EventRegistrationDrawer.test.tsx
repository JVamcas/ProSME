// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@/modules/content/ui/public/EventRegistrationForm",
  () => ({
    EventRegistrationForm: ({
      eventId,
      eventTitle,
    }: {
      eventId: number;
      eventTitle: string;
    }) => <p>{`${eventId}:${eventTitle}`}</p>,
  }),
);

import { EventRegistrationAction } from "@/modules/content/ui/public/EventRegistrationAction";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("public event registration drawer", () => {
  it("opens the selected event form in the shared right drawer", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <EventRegistrationAction
          eventId={42}
          eventTitle="Funding information session"
          registrationAvailable
        />,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")?.click();
    });

    const drawer = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(drawer?.textContent).toContain("Register for this session");
    expect(drawer?.textContent).toContain("Funding information session");
    expect(drawer?.textContent).toContain("42:Funding information session");
  });

  it("disables registration with an accessible note when unavailable", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <EventRegistrationAction
          eventId={42}
          eventTitle="Funding information session"
          registrationAvailable={false}
        />,
      );
    });
    const button = container.querySelector<HTMLButtonElement>("button")!;
    expect(button.disabled).toBe(true);
    const note = document.getElementById(button.getAttribute("aria-describedby")!);
    expect(note?.textContent).toBe("Registration is not available yet.");
    await act(async () => button.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
