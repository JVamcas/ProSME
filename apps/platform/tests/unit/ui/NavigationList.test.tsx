// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import { NavigationList } from "@/shared/ui/navigation/NavigationList";
import {
  filterPortalRoutes,
  operationsPortalRoutes,
} from "@/shared/ui/portal/portal-navigation";

const location = vi.hoisted(() => ({ pathname: "/admin/conflict-reviews" }));

vi.mock("next/navigation", () => ({
  usePathname: () => location.pathname,
}));

const routes = filterPortalRoutes(
  operationsPortalRoutes,
  "operations",
  new Set([
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowCoiAllReview,
    permissionCodes.reportingWebsiteReadAll,
  ]),
);

afterEach(() => {
  document.body.replaceChildren();
  location.pathname = "/admin/conflict-reviews";
});

async function renderNavigation() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = async (collapsed = false) => {
    await act(async () => {
      root.render(<NavigationList routes={routes} collapsed={collapsed} dark />);
    });
  };
  await render();

  return { container, root, render };
}

function sectionButton(container: HTMLElement, label: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.textContent === label)!;
}

function controlledList(button: HTMLButtonElement) {
  return document.getElementById(button.getAttribute("aria-controls")!)!;
}

describe("collapsible navigation sections", () => {
  it("toggles section links independently without navigating", async () => {
    const { container, root } = await renderNavigation();
    const queue = sectionButton(container, "My Queue");
    const analytics = sectionButton(container, "Analytics");
    const monitor = sectionButton(container, "Process Monitor");

    expect(queue.getAttribute("aria-expanded")).toBe("true");
    expect(controlledList(queue).hidden).toBe(false);
    expect(controlledList(queue).className).toContain("sectionChildren");
    expect(container.querySelector('a[href="/admin/my-work"]')).toBeNull();
    expect(
      container.querySelector('a[href="/admin/conflict-reviews"]')
        ?.getAttribute("aria-current"),
    ).toBe("page");

    await act(async () => queue.click());

    expect(queue.getAttribute("aria-expanded")).toBe("false");
    expect(controlledList(queue).hidden).toBe(true);
    expect(analytics.getAttribute("aria-expanded")).toBe("true");
    expect(controlledList(analytics).hidden).toBe(false);
    expect(controlledList(monitor).hidden).toBe(false);

    await act(async () => queue.click());

    expect(queue.getAttribute("aria-expanded")).toBe("true");
    expect(controlledList(queue).hidden).toBe(false);
    await act(async () => root.unmount());
  });

  it("keeps links accessible in the icon rail and restores section state", async () => {
    const { container, root, render } = await renderNavigation();
    const queue = sectionButton(container, "My Queue");
    const listId = queue.getAttribute("aria-controls")!;
    await act(async () => queue.click());

    await render(true);

    expect(container.querySelector("button[aria-expanded]")).toBeNull();
    expect(document.getElementById(listId)?.hidden).toBe(false);
    expect(
      container.querySelector('a[title="Assigned tasks"]'),
    ).not.toBeNull();

    await render(false);

    expect(sectionButton(container, "My Queue").getAttribute("aria-expanded"))
      .toBe("false");
    expect(document.getElementById(listId)?.hidden).toBe(true);
    await act(async () => root.unmount());
  });

  it("reveals links again after navigating to another page", async () => {
    const { container, root, render } = await renderNavigation();
    const queue = sectionButton(container, "My Queue");
    await act(async () => queue.click());

    location.pathname = "/admin/work-queue";
    await render();

    expect(queue.getAttribute("aria-expanded")).toBe("true");
    expect(controlledList(queue).hidden).toBe(false);
    expect(
      container.querySelector('a[href="/admin/work-queue"]')
        ?.getAttribute("aria-current"),
    ).toBe("page");
    await act(async () => root.unmount());
  });
});
