import { describe, expect, it } from "vitest";

import { primaryNavigation } from "@/components/layout/primary-navigation";

describe("primary navigation", () => {
  it("defines application routes in code", () => {
    expect(primaryNavigation).toContainEqual({
      href: "/funding",
      label: "Funding",
    });
    expect(primaryNavigation).toContainEqual({
      href: "/contact",
      label: "Contact",
    });
  });

  it("does not contain duplicate routes", () => {
    const routes = primaryNavigation.map(({ href }) => href);

    expect(new Set(routes).size).toBe(routes.length);
  });
});
