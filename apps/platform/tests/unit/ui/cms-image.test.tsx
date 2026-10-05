import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CmsImage } from "@/modules/content/ui/public/CmsImage";

describe("CmsImage", () => {
  it("delivers Payload media through the Next optimizer", () => {
    const markup = renderToStaticMarkup(
      <CmsImage
        image={{
          alt: "Programme event",
          url: "https://smefund.test/api/media/file/event.jpg",
          width: 640,
          height: 480,
          sizes: {
            mobile: { url: "/api/media/file/event-640x480.jpg", width: 640 },
          },
        }}
      />,
    );

    expect(markup).toContain("/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fevent-640x480.jpg");
    expect(markup).toContain("srcSet=");
    expect(markup).not.toContain('src="/api/media/file/event.jpg"');
  });
});
