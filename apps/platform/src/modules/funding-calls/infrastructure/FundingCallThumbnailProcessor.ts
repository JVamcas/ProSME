import "server-only";

import sharp from "sharp";

import { RequestValidationError } from "@/lib/resource-errors";
import {
  fundingCallThumbnailStoredMaximumBytes,
  fundingCallThumbnailWidths,
} from "../domain/FundingCallThumbnailPolicy";

export async function processFundingCallThumbnail(body: Buffer) {
  try {
    const image = sharp(body, { failOn: "warning", limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (
      !metadata.width
      || !metadata.height
      || !["jpeg", "png", "webp"].includes(metadata.format ?? "")
      || (metadata.pages ?? 1) > 1
    ) {
      throw new Error("Unsupported thumbnail image");
    }

    return await Promise.all(fundingCallThumbnailWidths.map(async (width) => {
      // Detailed/noisy images may need smaller dimensions as well as compression.
      for (
        let maximumWidth: number = width;
        maximumWidth >= 128;
        maximumWidth = Math.floor(maximumWidth / 2)
      ) {
        for (const quality of [80, 65, 50]) {
          const resized = await image.clone()
            .rotate()
            .resize({
              width: maximumWidth,
              height: Math.min(1024, Math.round(1024 * maximumWidth / width)),
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality })
            .toBuffer();
          if (resized.length <= fundingCallThumbnailStoredMaximumBytes) {
            return { body: resized, width };
          }
        }
      }
      throw new RequestValidationError(
        "The thumbnail could not be compressed below 200 KB. Choose a simpler image.",
      );
    }));
  } catch (error) {
    if (error instanceof RequestValidationError) throw error;
    throw new RequestValidationError(
      "The thumbnail cannot be decoded. Choose a valid, non-animated JPG, PNG, or WebP image up to 40 megapixels.",
    );
  }
}
