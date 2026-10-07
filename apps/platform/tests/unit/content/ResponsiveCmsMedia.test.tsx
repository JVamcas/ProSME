import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/payload/access/cms-resource-access", () => ({
  cmsMediaAccess: () => ({}),
}));

import { media } from "@/modules/content/infrastructure/ContentProjection";
import { CmsImage } from "@/modules/content/ui/public/CmsImage";
import { CmsRichText } from "@/modules/content/ui/public/CmsRichText";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import {
  cmsImageSource,
  createCmsImageLoader,
} from "@/modules/content/ui/public/CmsImageDelivery";
import type { CmsImage as CmsImageValue } from "@/modules/content/ContentTypes";

const image: CmsImageValue = {
  url: "https://site.test/api/media/file/original.jpg",
  width: 3000,
  height: 2000,
  alt: "A business owner",
  sizes: {
    thumbnail: { url: "/api/media/file/thumbnail.webp", width: 320 },
    mobile: { url: "/api/media/file/mobile.webp", width: 640 },
    tablet: { url: "/api/media/file/tablet.webp", width: 1024 },
    desktop: { url: "/api/media/file/desktop.webp", width: 1600 },
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
      `/api/media/file/${variant}.webp`,
    );
  });

  it("delivers generated WebP variants without a runtime transform", () => {
    const source = createCmsImageLoader(image)({
      src: image.url,
      width: 640,
      quality: 75,
    });
    const url = new URL(source, "https://site.test");

    expect(url.pathname).toBe("/api/media/file/mobile.webp");
    expect(url.searchParams.has("w")).toBe(false);
    expect(url.searchParams.has("q")).toBe(false);
  });

  it("preserves the UUID prefix and rejects legacy raster variants", () => {
    const prefix = "media/b20395c3-d076-4f44-84a3-bf3c62da071d";
    const variantUrl = `/api/media/file/mobile.webp?prefix=${encodeURIComponent(prefix)}`;
    const modern = { ...image, sizes: { mobile: { url: variantUrl, width: 640 } } };
    expect(createCmsImageLoader(modern)({ src: image.url, width: 640 })).toBe(variantUrl);

    const legacy = {
      ...image,
      sizes: { mobile: { url: variantUrl.replace(".webp", ".png"), width: 640 } },
    };
    expect(cmsImageSource(legacy, 640)).toBeUndefined();
    expect(() => createCmsImageLoader(legacy)({ src: image.url, width: 640 }))
      .toThrow("no generated WebP sizes");
  });

  it("renders responsive Next image candidates without referencing the original upload", () => {
    const markup = renderToStaticMarkup(
      <CmsImage image={image} sizes="100vw" />,
    );

    expect(markup).toContain("srcSet=");
    expect(markup).not.toContain("/_next/image?url=");
    expect(markup).toContain("mobile.webp");
    expect(markup).toContain("tablet.webp");
    expect(markup).toContain("desktop.webp");
    expect(markup).not.toContain("original.jpg");
    expect(markup).toContain('alt="A business owner"');
  });

  it("requires generated WebP variants even for small raster originals", () => {
    const smallImage = { ...image, width: 200, height: 133, sizes: undefined };
    expect(cmsImageSource(smallImage, 640)).toBeUndefined();
    expect(() => createCmsImageLoader(smallImage)({ src: smallImage.url, width: 640 }))
      .toThrow("no generated WebP sizes");
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
      url: "/api/media/file/tablet.webp",
      width: 1024,
    });
    expect(projected?.sizes?.thumbnail).toBeUndefined();
    expect(projected?.sizes?.mobile).toBeUndefined();
  });

  it("uses generated WebP variants for images embedded in rich text", () => {
    const data = uploadContent({ ...image, mimeType: "image/jpeg" });
    const markup = renderToStaticMarkup(<CmsRichText data={data} />);

    expect(markup).not.toContain("/_next/image?url=");
    expect(markup).toContain("mobile.webp");
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

    expect(markup).toContain("desktop.webp");
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
