import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CmsImage } from "@/components/public/cms-image";

describe("CmsImage", () => {
  it("loads Payload media directly instead of using the Next optimizer", () => {
    const markup = renderToStaticMarkup(
      <CmsImage
        image={{
          alt: "Programme event",
          url: "https://smefund.test/api/media/file/event.jpg",
        }}
      />,
    );

    expect(markup).toContain('src="/api/media/file/event.jpg"');
    expect(markup).not.toContain("/_next/image");
  });
});
