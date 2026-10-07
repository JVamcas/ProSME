import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CmsImage } from "@/modules/content/ui/public/CmsImage";

describe("CmsImage", () => {
  it("delivers generated WebP variants through Payload without a second transform", () => {
    const markup = renderToStaticMarkup(
      <CmsImage
        image={{
          alt: "Programme event",
          url: "https://smefund.test/api/media/file/event.jpg",
          width: 640,
          height: 480,
          sizes: {
            mobile: { url: "/api/media/file/event-640x480.webp", width: 640 },
          },
        }}
      />,
    );

    expect(markup).toContain("/api/media/file/event-640x480.webp");
    expect(markup).not.toContain("/_next/image");
    expect(markup).toContain("srcSet=");
    expect(markup).not.toContain('src="/api/media/file/event.jpg"');
  });
});
