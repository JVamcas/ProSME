import { describe, expect, it } from "vitest";

import {
  fundingCallThumbnailMaximumBytes,
} from "@/modules/funding-calls/api/FundingCallSchemas";
import { validateFundingCallThumbnail } from "@/modules/funding-calls/application/FundingCallThumbnailValidation";

function imageFile(name: string, type: string, bytes: number[]) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("funding call thumbnail validation", () => {
  it("accepts a PNG whose content matches its extension", async () => {
    const file = imageFile(
      "funding-call.png",
      "image/png",
      [137, 80, 78, 71, 13, 10, 26, 10, 0],
    );

    expect(validateFundingCallThumbnail(
      file,
      Buffer.from(await file.arrayBuffer()),
    )).toEqual({
      contentType: "image/png",
      extension: ".png",
      fileName: "funding-call.png",
    });
  });

  it("rejects unsupported and oversized files", () => {
    const svg = imageFile("thumbnail.svg", "image/svg+xml", [60, 115, 118, 103]);
    expect(() => validateFundingCallThumbnail(svg, Buffer.from("<svg")))
      .toThrow("Choose a JPG, PNG, or WebP thumbnail.");

    const oversized = new File(
      [new Uint8Array(fundingCallThumbnailMaximumBytes + 1)],
      "large.png",
      { type: "image/png" },
    );
    expect(() => validateFundingCallThumbnail(
      oversized,
      Buffer.alloc(fundingCallThumbnailMaximumBytes + 1),
    )).toThrow("no larger than 2 MB");
  });

  it("rejects a file whose bytes do not match its extension", async () => {
    const file = imageFile("fake.webp", "image/webp", [137, 80, 78, 71]);
    const body = Buffer.from(await file.arrayBuffer());
    expect(() => validateFundingCallThumbnail(
      file,
      body,
    )).toThrow("thumbnail content is invalid");
  });
});
