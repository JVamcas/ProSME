// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import { PortalMobileHeader } from "@/components/layout/portal-mobile-header";
import { createQueryClient } from "@/lib/query-client";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";

vi.mock("next/navigation", () => ({
  usePathname: () => "/portal/profile",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const context: PortalContext = {
  availableSpaces: ["applicant"],
  capabilityCodes: [permissionCodes.userProfileOwnRead],
  defaultSpace: "applicant",
  displayName: "Petrus Kambala",
  email: "petrus@example.test",
  roleCodes: ["applicant"],
  status: "active",
  userId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
};

afterEach(() => {
  document.body.replaceChildren();
});

async function renderHeader() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={createQueryClient()}>
        <PortalMobileHeader context={context} space="applicant" />
      </QueryClientProvider>,
    );
  });

  return { container, root };
}

describe("portal mobile header", () => {
  it("closes the drawer after a menu item is selected", async () => {
    const { container, root } = await renderHeader();
    const details = container.querySelector("details");
    const profileLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/portal/profile"]',
    );
    details!.open = true;
    profileLink?.addEventListener("click", (event) => event.preventDefault());

    await act(async () => {
      profileLink?.click();
    });

    expect(details?.open).toBe(false);
    await act(async () => root.unmount());
  });

  it("closes the drawer after an outside press", async () => {
    const { container, root } = await renderHeader();
    const details = container.querySelector("details");
    details!.open = true;

    await act(async () => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });

    expect(details?.open).toBe(false);
    await act(async () => root.unmount());
  });
});
