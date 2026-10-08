import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeProcess } from "@/modules/content/ui/public/HomeProcess";
import { homepageFixture } from "../../support/HomepageFixture";

describe("homepage process", () => {
  it("stops dotted connectors before the following step number", () => {
    const markup = renderToStaticMarkup(<HomeProcess content={homepageFixture} />);

    expect(markup.match(/border-dotted/g)).toHaveLength(3);
    expect(markup.match(/-right-2/g)).toHaveLength(3);
    expect(markup).not.toContain("w-[calc(56%-2rem)]");
  });
});
