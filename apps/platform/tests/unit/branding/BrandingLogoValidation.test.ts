import { describe, expect, it } from "vitest";

import { validateBrandingLogo } from "@/modules/branding/application/BrandingLogoValidation";

function file(name: string, type: string, content: string | ArrayBuffer) {
  return new File([content], name, { type });
}

describe("branding logo validation", () => {
  it("accepts supported raster and safe SVG logos", async () => {
    const png = file(
      "logo.png",
      "image/png",
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).buffer,
    );
    const svg = file(
      "logo.svg",
      "image/svg+xml",
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
    );

    expect(validateBrandingLogo(
      png,
      Buffer.from(await png.arrayBuffer()),
    ).contentType).toBe("image/png");
    expect(validateBrandingLogo(
      svg,
      Buffer.from(await svg.arrayBuffer()),
    ).contentType).toBe("image/svg+xml");
  });

  it("rejects executable SVG content", async () => {
    const svg = file(
      "logo.svg",
      "image/svg+xml",
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    const body = Buffer.from(await svg.arrayBuffer());

    expect(() => validateBrandingLogo(
      svg,
      body,
    )).toThrow("invalid or unsafe");
  });
});
