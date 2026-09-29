import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

import { ActiveNavigationLink } from "@/shared/ui/navigation/ActiveNavigationLink";

function renderLink(href: string, pathname: string) {
  route.pathname = pathname;
  return renderToStaticMarkup(
    <ActiveNavigationLink href={href} label="Navigation" />,
  );
}

describe("public navigation selection", () => {
  it("marks the current section on its detail pages", () => {
    const markup = renderLink("/funding", "/funding/growth-fund");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("border-brand-orange text-brand-orange");
  });

  it("selects Home only on the homepage", () => {
    expect(renderLink("/", "/")).toContain('aria-current="page"');
    expect(renderLink("/", "/funding")).not.toContain("aria-current");
  });

  it("does not select a section with only a matching prefix", () => {
    expect(renderLink("/news", "/newsletter")).not.toContain("aria-current");
  });
});
