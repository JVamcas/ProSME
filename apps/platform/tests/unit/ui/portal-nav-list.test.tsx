// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortalNavList } from "@/shared/ui/portal/portal-nav-list";
import { operationsPortalRoutes } from "@/shared/ui/portal/portal-navigation";

const navigationMock = vi.hoisted(() => ({ pathname: "/admin" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
}));

beforeEach(() => {
  navigationMock.pathname = "/admin";
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("portal navigation list", () => {
  it("keeps nested routes closed by default and toggles them from the parent", async () => {
    const administration = operationsPortalRoutes.find(
      (route) => route.id === "admin-settings",
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PortalNavList dark routes={[administration!]} />);
    });

    const toggle = container.querySelector<HTMLButtonElement>("button");
    const childListId = toggle?.getAttribute("aria-controls");

    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(childListId).toContain("admin-settings-children");
    expect(document.getElementById(childListId!)).toBeNull();
    expect(container.textContent).not.toContain("Workflow Templates");

    await act(async () => {
      toggle?.click();
    });

    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById(childListId!)).not.toBeNull();
    expect(container.textContent).toContain("Workflow Templates");

    await act(async () => {
      toggle?.click();
    });

    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(childListId!)).toBeNull();

    await act(async () => root.unmount());
  });

  it("renders and expands routes recursively for an active third-level route", async () => {
    navigationMock.pathname = "/admin/notifications/channels";
    const administration = operationsPortalRoutes.find(
      (route) => route.id === "admin-settings",
    );
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<PortalNavList dark routes={[administration!]} />);
    });

    const expandedToggles = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        'button[aria-expanded="true"]',
      ),
    );
    const activeLink = container.querySelector<HTMLAnchorElement>(
      'a[aria-current="page"]',
    );

    expect(expandedToggles.map((toggle) => toggle.textContent)).toEqual([
      "Administration",
      "Notifications",
    ]);
    expect(activeLink?.textContent).toBe("Channels");
    expect(activeLink?.getAttribute("href")).toBe(
      "/admin/notifications/channels",
    );

    const notificationsToggle = expandedToggles.find((toggle) =>
      toggle.textContent?.includes("Notifications"),
    );

    await act(async () => {
      notificationsToggle?.click();
    });

    expect(notificationsToggle?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Channels");

    await act(async () => {
      notificationsToggle?.click();
    });

    expect(notificationsToggle?.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Channels");

    await act(async () => root.unmount());
  });
});
