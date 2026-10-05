import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { WorkspaceSpace } from "@/auth/authorization/portal-access";
import { PortalSpaceSwitcher } from "@/shared/ui/portal/portal-space-switcher";

const allSpaces: WorkspaceSpace[] = ["applicant", "operations", "cms"];

describe("workspace switcher", () => {
  it.each(allSpaces)("highlights only the current %s workspace", (space) => {
    const markup = renderToStaticMarkup(
      <PortalSpaceSwitcher
        availableSpaces={allSpaces}
        currentSpace={space}
        dark={space === "operations"}
      />,
    );
    const links = [...markup.matchAll(/<a\b[^>]*>[^<]*<\/a>/g)].map(
      (match) => match[0],
    );
    const currentLinks = links.filter((link) =>
      link.includes('aria-current="page"'),
    );
    const currentHref = {
      applicant: "/portal",
      operations: "/admin",
      cms: "/cms",
    }[space];

    expect(links).toHaveLength(3);
    // Payload uses a smaller root font than the portals. Fixed switcher text
    // sizing keeps every workspace consistent across those layouts.
    for (const link of links) {
      expect(link).toContain("text-[12px]");
    }
    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toContain(`href="${currentHref}"`);
    const inactiveLinks = links.filter((link) =>
      !link.includes('aria-current="page"'),
    );
    for (const link of inactiveLinks) {
      const classes = link.match(/class="([^"]*)"/)?.[1];
      expect(classes).not.toMatch(/(?:^|\s)bg-brand-(?:blue|navy)\b/);
    }
  });

  it("works in CMS without a Query provider and disables unavailable destinations", () => {
    const markup = renderToStaticMarkup(
      <PortalSpaceSwitcher availableSpaces={["cms"]} currentSpace="cms" />,
    );

    expect(markup).toContain('aria-label="Switch portal space"');
    expect(markup.match(/<a\b/g)).toHaveLength(1);
    expect(markup).toContain('href="/cms"');
    expect(markup).not.toContain('href="/portal"');
    expect(markup).not.toContain('href="/admin"');
    expect(markup.match(/aria-disabled="true"/g)).toHaveLength(2);
  });
});
