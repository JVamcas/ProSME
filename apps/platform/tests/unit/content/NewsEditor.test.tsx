// @vitest-environment happy-dom

import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupFieldClientProps } from "payload";

const state = vi.hoisted(() => ({
  thumbnail: undefined as unknown,
  embeddedMedia: undefined as unknown,
  fields: {} as Record<string, { value: unknown }>,
}));
vi.mock("@payloadcms/ui", () => ({
  useDocumentInfo: () => ({ id: 42 }),
  useFormFields: (select: (value: [typeof state.fields]) => unknown) => select([state.fields]),
  GroupField: (props: GroupFieldClientProps) => <div data-native-editor={props.path} data-read-only={props.readOnly} />,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/cms/collections/news/42" }));
vi.mock("@/modules/content/ui/admin/useCmsMediaPreview", () => ({
  useCmsMediaPreview: () => state.thumbnail,
  useCmsMediaRecord: () => state.embeddedMedia,
}));

import CmsNewsContentGroupField from "@/modules/content/ui/admin/CmsNewsContentGroupField";

beforeEach(() => {
  state.thumbnail = undefined;
  state.embeddedMedia = undefined;
  state.fields = {
    title: { value: "Funding criteria" },
    slug: { value: "funding-criteria" },
    excerpt: { value: "Approved guidance" },
  };
});

describe("Native CMS news editor", () => {
  it("renders the public card in an inert preview while retaining native read-only editing", () => {
    const html = renderToStaticMarkup(
      <CmsNewsContentGroupField {...({ path: "", readOnly: true } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Funding criteria");
    expect(html).toContain("Approved guidance");
    expect(html).toContain('href="/news/42"');
    expect(html).toContain("max-w-md");
    expect(html).toContain("News card preview");
    expect(html).toContain("Article preview");
    expect(html).toContain('inert=""');
    expect(html).toContain('data-read-only="true"');
  });

  it("handles an incomplete publication date while editing", () => {
    state.fields.publishedAt = { value: "invalid-date" };
    const props = { path: "" } as GroupFieldClientProps;
    expect(() => renderToStaticMarkup(<CmsNewsContentGroupField {...props} />))
      .not.toThrow();
  });

  it("uses the public card crop and article header for the cover image", () => {
    state.thumbnail = {
      url: "/media/cover.jpg",
      alt: "Article cover",
      sizes: { desktop: { url: "/media/cover-desktop.webp", width: 1600 } },
    };
    const html = renderToStaticMarkup(
      <CmsNewsContentGroupField {...({ path: "" } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("aspect-video");
    expect(html).toContain("object-center");
    expect(html).toContain("aspect-4/3");
    expect(html.match(/alt="Article cover"/g)).toHaveLength(2);
    expect(html).not.toContain("object-top");
  });

  it("resolves embedded editor media IDs before rendering the live article preview", () => {
    state.embeddedMedia = {
      url: "/media/body.jpg",
      mimeType: "image/jpeg",
      alt: "Inside the article",
      sizes: { desktop: { url: "/media/body-desktop.webp", width: 1600 } },
    };
    state.fields.body = {
      value: {
        root: {
          type: "root",
          version: 1,
          direction: null,
          format: "",
          indent: 0,
          children: [
            { type: "upload", version: 3, relationTo: "media", value: 123 },
          ],
        },
      },
    };
    const html = renderToStaticMarkup(
      <CmsNewsContentGroupField {...({ path: "" } as GroupFieldClientProps)} />,
    );
    expect(html).toContain('alt="Inside the article"');
    expect(html).toContain("body-desktop.webp");
  });

  it("resolves layout image IDs in the shared article preview", () => {
    state.embeddedMedia = {
      url: "/media/section.jpg",
      mimeType: "image/jpeg",
      alt: "Section photo",
      sizes: {
        desktop: { url: "/media/section-desktop.webp", width: 1600 },
      },
    };
    state.fields.body = {
      value: {
        root: {
          type: "root",
          version: 1,
          direction: null,
          format: "",
          indent: 0,
          children: [{
            type: "block",
            version: 2,
            fields: {
              id: "section-1",
              blockType: "articleTextImage",
              heading: "Advisory services",
              image: 123,
              imagePosition: "left",
              caption: "A workshop",
              button: { label: "Contact us", href: "/contact" },
            },
          }],
        },
      },
    };
    const html = renderToStaticMarkup(
      <CmsNewsContentGroupField {...({ path: "" } as GroupFieldClientProps)} />,
    );
    expect(html).toContain('alt="Section photo"');
    expect(html).toContain('data-image-position="left"');
    expect(html).toContain("Advisory services");
    expect(html).toContain("A workshop");
    expect(html).toContain('href="/contact"');
    expect(html).toContain("max-w-6xl");
  });
});
