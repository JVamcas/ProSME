// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortalUserMenu } from "@/components/layout/portal-user-menu";
import { createQueryClient } from "@/lib/query-client";
import type { PortalContext } from "@/modules/profiles/profile.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const context: PortalContext = {
  userId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  displayName: "Petrus Kambala",
  email: "petrus@example.test",
  status: "active",
  roleCodes: ["applicant"],
  capabilityCodes: [],
  availableSpaces: ["applicant"],
  defaultSpace: "applicant",
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("portal user menu", () => {
  it("closes when the user presses outside the menu", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={createQueryClient()}>
          <PortalUserMenu context={context} />
        </QueryClientProvider>,
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-controls="portal-user-menu"]',
    );
    await act(async () => {
      trigger?.click();
    });
    expect(container.querySelector("#portal-user-menu")).not.toBeNull();

    await act(async () => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(container.querySelector("#portal-user-menu")).toBeNull();

    await act(async () => root.unmount());
  });
});
