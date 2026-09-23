// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
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

async function renderShell() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <QueryClientProvider client={createQueryClient()}>
        <AuthenticatedPortalShell context={context} space="applicant">
          <h1>Profile</h1>
        </AuthenticatedPortalShell>
      </QueryClientProvider>,
    );
  });

  return { container, root };
}

describe("portal desktop sidebar", () => {
  it("can be closed and opened again", async () => {
    const { container, root } = await renderShell();
    const closeButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Close navigation sidebar"]',
    );

    await act(async () => closeButton?.click());

    const openButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Open navigation sidebar"]',
    );
    expect(openButton).not.toBeNull();
    expect(container.querySelector("aside")).toBeNull();

    await act(async () => openButton?.click());

    expect(container.querySelector("aside")).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Open navigation sidebar"]'),
    ).toBeNull();
    await act(async () => root.unmount());
  });

  it("resizes with dragging and keyboard controls", async () => {
    const { container, root } = await renderShell();
    const shell = container.firstElementChild as HTMLDivElement;
    const handle = container.querySelector<HTMLElement>(
      '[aria-label="Resize navigation sidebar"]',
    );

    expect(handle?.getAttribute("aria-valuenow")).toBe("272");

    await act(async () => {
      handle?.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }),
      );
      handle?.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: 360,
          pointerId: 1,
        }),
      );
      handle?.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }),
      );
    });

    expect(shell.style.gridTemplateColumns).toContain("360px");

    await act(async () => {
      handle?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft" }),
      );
    });

    expect(shell.style.gridTemplateColumns).toContain("344px");
    expect(handle?.getAttribute("aria-valuenow")).toBe("344");
    await act(async () => root.unmount());
  });
});
