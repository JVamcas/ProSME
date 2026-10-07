import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollectionBeforeChangeHook } from "payload";
import { getFileKey } from "@payloadcms/plugin-cloud-storage/utilities";

vi.mock("server-only", () => ({}));
vi.mock("@/payload/access/cms-resource-access", () => ({
  cmsMediaAccess: () => ({}),
}));

import { organizeCmsMedia } from "@/modules/content/infrastructure/CmsMediaStorage";
import { Media } from "@/payload/collections/content/Media";
import {
  resolveGcsObjectPath,
  gcsObjectPathSegments,
} from "@/integrations/storage/GcsObjectPath";

afterEach(() => vi.unstubAllEnvs());

async function storageChange(
  values: Pick<
    Parameters<CollectionBeforeChangeHook>[0],
    "data" | "operation"
  > & {
    originalDoc?: { prefix?: string | null };
    req?: { file?: { data: Buffer } };
  },
) {
  return organizeCmsMedia({ req: {}, ...values } as Parameters<CollectionBeforeChangeHook>[0]);
}

describe("CMS media storage folders", () => {
  it("encodes generated variants as WebP without converting original uploads", () => {
    if (typeof Media.upload !== "object") {
      throw new Error("Media upload configuration is required.");
    }
    expect(Media.upload.formatOptions).toBeUndefined();
    expect(Media.upload.imageSizes).toHaveLength(4);
    for (const size of Media.upload.imageSizes ?? []) {
      expect(size.formatOptions).toEqual({
        format: "webp",
        options: { quality: 75, effort: 4 },
      });
    }
  });
  it("gives variants different names even when their dimensions are equal", () => {
    if (typeof Media.upload !== "object") {
      throw new Error("Media upload configuration is required.");
    }
    const names = Media.upload.imageSizes?.map((size) =>
      size.generateImageName?.({
        extension: "webp",
        originalName: "small-original",
        sizeName: size.name,
        width: 200,
        height: 150,
      }),
    );

    expect(names).toEqual([
      "small-original-thumbnail.webp",
      "small-original-mobile.webp",
      "small-original-tablet.webp",
      "small-original-desktop.webp",
    ]);
  });

  it("places originals and variants in one unique environment/CMS media folder", async () => {
    vi.stubEnv("ENVIRONMENT", "dev");
    const first = await storageChange({
      data: { prefix: "../../root" },
      operation: "create",
    });
    const second = await storageChange({ data: {}, operation: "create" });

    expect(first.prefix).toMatch(/^media\/[0-9a-f-]{36}$/);
    expect(first.prefix).not.toBe(second.prefix);
    for (const filename of [
      "original.jpg",
      "original-320x213.jpg",
      "original-1600x1067.jpg",
    ]) {
      const { fileKey } = getFileKey({
        collectionPrefix: resolveGcsObjectPath(...gcsObjectPathSegments.cms),
        docPrefix: first.prefix,
        filename,
        useCompositePrefixes: true,
      });
      expect(fileKey).toBe(`dev/cms/${first.prefix}/${filename}`);
    }
  });

  it.each(["", "old/path", "media/invalid-folder"])(
    "moves a replacement file from %j into a UUID folder",
    async (prefix) => {
      const data = await storageChange({
        data: { prefix: "a/different/folder" },
        operation: "update",
        originalDoc: { prefix },
        req: { file: { data: Buffer.from("image") } },
      });

      expect(data.prefix).toMatch(/^media\/[0-9a-f-]{36}$/);
    },
  );

  it("preserves a UUID folder through the storage adapter's internal update", async () => {
    const prefix = "media/b20395c3-d076-4f44-84a3-bf3c62da071d";
    const data = await storageChange({
      data: { prefix: "a/different/folder" },
      operation: "update",
      originalDoc: { prefix },
    });

    expect(data.prefix).toBe(prefix);
  });

  it("uses a fresh folder when replacing a file already in a UUID folder", async () => {
    const prefix = "media/b20395c3-d076-4f44-84a3-bf3c62da071d";
    const data = await storageChange({
      data: {},
      operation: "update",
      originalDoc: { prefix },
      req: { file: { data: Buffer.from("image") } },
    });

    expect(data.prefix).toMatch(/^media\/[0-9a-f-]{36}$/);
    expect(data.prefix).not.toBe(prefix);
  });

  it("requires migration before metadata-only saves in old folders", async () => {
    await expect(storageChange({
      data: { alt: "Updated text" },
      operation: "update",
      originalDoc: { prefix: "" },
      req: {},
    })).rejects.toThrow("Migrate this media record");
  });
});
