import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollectionBeforeChangeHook } from "payload";
import { getFileKey } from "@payloadcms/plugin-cloud-storage/utilities";

vi.mock("server-only", () => ({}));
vi.mock("@/payload/access/cms-resource-access", () => ({
  cmsMediaAccess: () => ({}),
}));

import { organizeCmsMedia } from "@/modules/content/infrastructure/CmsMediaStorage";
import { Media } from "@/payload/collections/content/Media";
import { media } from "@/modules/content/infrastructure/ContentProjection";
import { CmsImage } from "@/modules/content/ui/public/CmsImage";
import { CmsRichText } from "@/modules/content/ui/public/CmsRichText";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import {
  cmsImageSource,
  createCmsImageLoader,
} from "@/modules/content/ui/public/CmsImageDelivery";
import type { CmsImage as CmsImageValue } from "@/modules/content/ContentTypes";
import {
  resolveGcsObjectPath,
  gcsObjectPathSegments,
} from "@/integrations/storage/GcsObjectPath";

const image: CmsImageValue = {
  url: "https://site.test/api/media/file/original.jpg",
  width: 3000,
  height: 2000,
  alt: "A business owner",
  sizes: {
    thumbnail: { url: "/api/media/file/thumbnail.jpg", width: 320 },
    mobile: { url: "/api/media/file/mobile.jpg", width: 640 },
    tablet: { url: "/api/media/file/tablet.jpg", width: 1024 },
    desktop: { url: "/api/media/file/desktop.jpg", width: 1600 },
  },
};

afterEach(() => vi.unstubAllEnvs());

describe("responsive CMS media delivery", () => {
  it.each([
    [180, "thumbnail"],
    [640, "mobile"],
    [828, "tablet"],
    [1600, "desktop"],
    [3840, "desktop"],
  ])("chooses a generated variant for a %ipx request", (width, variant) => {
    expect(cmsImageSource(image, Number(width))).toBe(
      `/api/media/file/${variant}.jpg`,
    );
  });

  it("routes selected variants through Next's optimizer and preserves quality", () => {
    const source = createCmsImageLoader(image)({
      src: image.url,
      width: 640,
      quality: 75,
    });
    const url = new URL(source, "https://site.test");

    expect(url.pathname).toBe("/_next/image");
    expect(url.searchParams.get("url")).toBe("/api/media/file/mobile.jpg");
    expect(url.searchParams.get("w")).toBe("640");
    expect(url.searchParams.get("q")).toBe("75");
  });

  it("renders responsive Next image candidates without referencing the original upload", () => {
    const markup = renderToStaticMarkup(
      <CmsImage image={image} sizes="100vw" />,
    );

    expect(markup).toContain("srcSet=");
    expect(markup).toContain("/_next/image?url=");
    expect(markup).toContain("mobile.jpg");
    expect(markup).toContain("tablet.jpg");
    expect(markup).toContain("desktop.jpg");
    expect(markup).not.toContain("original.jpg");
    expect(markup).toContain('alt="A business owner"');
  });

  it("optimizes originals smaller than the smallest generated size", () => {
    const smallImage = { ...image, width: 200, height: 133, sizes: undefined };
    const source = createCmsImageLoader(smallImage)({
      src: smallImage.url,
      width: 640,
    });

    expect(new URL(source, "https://site.test").searchParams.get("url")).toBe(
      "/api/media/file/original.jpg",
    );
  });

  it("requires generated sizes for standard raster images", () => {
    const incomplete = { ...image, sizes: undefined };

    expect(cmsImageSource(incomplete, 640)).toBeUndefined();
    expect(renderToStaticMarkup(<CmsImage image={incomplete} />)).toBe("");
  });

  it("uses the vector original without raster thumbnails", () => {
    const vector = { ...image, url: "/api/media/file/logo.svg", sizes: undefined };

    expect(cmsImageSource(vector, 640)).toBe(vector.url);
    expect(renderToStaticMarkup(<CmsImage image={vector} />)).not.toContain("/_next/image");
  });

  it("projects generated sizes and rejects missing or invalid size URLs", () => {
    const projected = media({
      ...image,
      sizes: {
        ...image.sizes,
        thumbnail: null,
        mobile: { url: null, width: 640 },
      },
    });

    expect(projected?.sizes?.tablet).toMatchObject({
      url: "/api/media/file/tablet.jpg",
      width: 1024,
    });
    expect(projected?.sizes?.thumbnail).toBeUndefined();
    expect(projected?.sizes?.mobile).toBeUndefined();
  });

  it("uses responsive optimization for images embedded in rich text", () => {
    const data = uploadContent({ ...image, mimeType: "image/jpeg" });
    const markup = renderToStaticMarkup(<CmsRichText data={data} />);

    expect(markup).toContain("/_next/image?url=");
    expect(markup).toContain("mobile.jpg");
    expect(markup).not.toContain("original.jpg");
  });

  it("retains download links for PDFs embedded in rich text", () => {
    const data = uploadContent({
      url: "/api/media/file/guide.pdf",
      filename: "guide.pdf",
      mimeType: "application/pdf",
    });
    const markup = renderToStaticMarkup(<CmsRichText data={data} />);

    expect(markup).toContain('href="/api/media/file/guide.pdf"');
    expect(markup).not.toContain("/_next/image");
  });

  it("renders rich-text images when generated size URLs are incomplete", () => {
    const data = uploadContent({
      ...image,
      mimeType: "image/jpeg",
      sizes: {
        mobile: { url: null, width: 640 },
        tablet: { width: 1024 },
        desktop: image.sizes?.desktop,
      },
    });
    const markup = renderToStaticMarkup(<CmsRichText data={data} />);

    expect(markup).toContain("desktop.jpg");
    expect(markup).not.toContain("original.jpg");
    expect(markup).not.toContain("url=undefined");
    expect(markup).not.toContain("url=null");
  });
});

function uploadContent(value: object): SerializedEditorState {
  const upload = { type: "upload", version: 3, relationTo: "media", value };

  return {
    root: {
      type: "root",
      version: 1,
      direction: null,
      format: "",
      indent: 0,
      children: [upload],
    },
  };
}

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
  it("gives variants different names even when their dimensions are equal", () => {
    if (typeof Media.upload !== "object") {
      throw new Error("Media upload configuration is required.");
    }
    const names = Media.upload.imageSizes?.map((size) =>
      size.generateImageName?.({
        extension: "jpg",
        originalName: "small-original",
        sizeName: size.name,
        width: 200,
        height: 150,
      }),
    );

    expect(names).toEqual([
      "small-original-thumbnail.jpg",
      "small-original-mobile.jpg",
      "small-original-tablet.jpg",
      "small-original-desktop.jpg",
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
