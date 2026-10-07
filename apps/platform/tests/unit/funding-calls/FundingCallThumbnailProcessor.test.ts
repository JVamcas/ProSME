import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fundingCallThumbnailStoredMaximumBytes } from "@/modules/funding-calls/domain/FundingCallThumbnailPolicy";
import { processFundingCallThumbnail } from "@/modules/funding-calls/infrastructure/FundingCallThumbnailProcessor";

describe("funding-call thumbnail processing", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "decodes %s and stores three bounded WebP sizes without metadata",
    async (format) => {
      const input = await sharp({
        create: { width: 1600, height: 900, channels: 3, background: "#123456" },
      }).withMetadata().toFormat(format).toBuffer();
      const variants = await processFundingCallThumbnail(input);

      expect(variants.map((variant) => variant.width)).toEqual([320, 640, 1024]);
      for (const variant of variants) {
        const metadata = await sharp(variant.body).metadata();
        expect(metadata.format).toBe("webp");
        expect(metadata.width).toBe(variant.width);
        expect(metadata.height).toBe(Math.round(variant.width * 9 / 16));
        expect(metadata.exif).toBeUndefined();
        expect(variant.body.length).toBeLessThanOrEqual(fundingCallThumbnailStoredMaximumBytes);
      }
    },
  );

  it("does not enlarge small uploads", async () => {
    const input = await sharp({
      create: { width: 80, height: 40, channels: 3, background: "red" },
    }).png().toBuffer();
    const variants = await processFundingCallThumbnail(input);
    for (const variant of variants) {
      const metadata = await sharp(variant.body).metadata();
      expect([metadata.width, metadata.height]).toEqual([80, 40]);
    }
  });

  it("applies EXIF orientation before resizing", async () => {
    const input = await sharp({
      create: { width: 900, height: 1600, channels: 3, background: "blue" },
    }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const [small] = await processFundingCallThumbnail(input);
    const metadata = await sharp(small.body).metadata();
    expect([metadata.width, metadata.height]).toEqual([320, 180]);
    expect(metadata.orientation).toBeUndefined();
  });

  it("reduces a detailed upload close to 2 MB below the stored limit", async () => {
    const pixels = Buffer.alloc(1024 * 1024 * 3);
    let seed = 42;
    for (let index = 0; index < pixels.length; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      pixels[index] = seed & 255;
    }
    const input = await sharp(pixels, {
      raw: { width: 1024, height: 1024, channels: 3 },
    }).jpeg({ quality: 100 }).toBuffer();
    expect(input.length).toBeGreaterThan(1024 * 1024);
    expect(input.length).toBeLessThanOrEqual(2 * 1024 * 1024);

    const variants = await processFundingCallThumbnail(input);
    for (const variant of variants) {
      expect(variant.body.length).toBeLessThanOrEqual(fundingCallThumbnailStoredMaximumBytes);
      expect(variant.body.length).toBeLessThan(input.length);
      const metadata = await sharp(variant.body).metadata();
      expect(metadata.width).toBeLessThanOrEqual(variant.width);
      expect(metadata.height).toBeLessThanOrEqual(1024);
    }
  });

  it("rejects an image header with no decodable image", async () => {
    await expect(processFundingCallThumbnail(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
    )).rejects.toThrow("cannot be decoded");
  });

  it("rejects animated WebP images", async () => {
    const pixels = Buffer.alloc(20 * 40 * 3, 100);
    pixels.fill(200, 20 * 20 * 3);
    const animated = await sharp(pixels, {
      raw: { width: 20, height: 40, channels: 3, pageHeight: 20 },
    }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
    expect((await sharp(animated).metadata()).pages).toBe(2);
    await expect(processFundingCallThumbnail(animated)).rejects.toThrow("non-animated");
  });

  it("rejects compressed images with excessive decoded dimensions", async () => {
    const input = await sharp({
      create: { width: 6500, height: 6500, channels: 3, background: "white" },
    }).png().toBuffer();
    await expect(processFundingCallThumbnail(input)).rejects.toThrow("40 megapixels");
  });
});
