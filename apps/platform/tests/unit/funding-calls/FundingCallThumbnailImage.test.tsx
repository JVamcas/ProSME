import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FundingCallThumbnailImage } from "@/modules/funding-calls/ui/FundingCallThumbnailImage";

describe("funding-call responsive thumbnail delivery", () => {
  it("renders responsive sizes and preserves the editor cache version", () => {
    const markup = renderToStaticMarkup(
      <FundingCallThumbnailImage
        alt="Preview"
        sizes="192px"
        src="/api/admin/funding-calls/call/thumbnail?v=123"
      />,
    );
    expect(markup).toContain('sizes="192px"');
    expect(markup).toContain("srcSet=");
    expect(markup).toContain("v=123&amp;width=320");
    expect(markup).toContain("v=123&amp;width=640");
    expect(markup).toContain("v=123&amp;width=1024");
    expect(markup).not.toContain("/_next/image");
  });
});
