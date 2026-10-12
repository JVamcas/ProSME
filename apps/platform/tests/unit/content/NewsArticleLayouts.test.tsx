import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { SerializedUploadNode } from "@payloadcms/richtext-lexical";

import { paragraphsToRichText } from "@/modules/content/ContentRichText";
import { articleLink, validateArticleLink } from "@/modules/content/domain/ArticleLink";
import { NewsArticleContent } from "@/modules/content/ui/public/NewsArticleContent";
import { newsArticleBlocks } from "@/payload/blocks/NewsArticleBlocks";

const photo = {
  id: 123,
  createdAt: "2026-10-12T10:00:00Z",
  updatedAt: "2026-10-12T10:00:00Z",
  url: "/media/advisory.jpg",
  mimeType: "image/jpeg",
  alt: "Business advisory session",
  width: 1200,
  height: 800,
  sizes: {
    desktop: { url: "/media/advisory-desktop.webp", width: 1600, height: 1067 },
  },
};

function article(fields: Record<string, unknown>[]): SerializedEditorState {
  return {
    root: {
      type: "root",
      version: 1,
      direction: null,
      format: "",
      indent: 0,
      children: fields.map((block, index) => ({
        type: "block",
        version: 2,
        fields: { id: `section-${index}`, ...block },
      })),
    },
  };
}

describe("News article layouts", () => {
  it("requires a standalone button destination while allowing an unused optional button", () => {
    expect(validateArticleLink("", { required: true })).not.toBe(true);
    expect(validateArticleLink("", { required: false })).toBe(true);
  });

  it("renders the complete alternating text/image example with its consultation button", () => {
    const html = renderToStaticMarkup(
      <NewsArticleContent data={article([
        {
          blockType: "articleTextImage",
          heading: "The MSME department",
          content: paragraphsToRichText(["Tailored support for MSMEs."]),
          image: photo,
          imagePosition: "right",
        },
        {
          blockType: "articleTextImage",
          heading: "Support for business advisory services",
          content: paragraphsToRichText(["Grow your business."]),
          image: photo,
          imagePosition: "left",
          button: { label: "Schedule a consultation", href: "/contact" },
        },
      ])} />,
    );
    expect(html.match(/data-article-layout="text-image"/g)).toHaveLength(2);
    expect(html).toContain('data-image-position="right"');
    expect(html).toContain('data-image-position="left"');
    expect(html).toContain("Tailored support for MSMEs.");
    expect(html).toContain("Grow your business.");
    expect(html).toContain('href="/contact"');
    expect(html).toContain("Schedule a consultation");
    expect(html.indexOf("The MSME department")).toBeLessThan(
      html.indexOf("Support for business advisory services"),
    );
  });

  it("renders both text columns, full-width captioned images and standalone buttons in saved order", () => {
    const html = renderToStaticMarkup(
      <NewsArticleContent data={article([
        {
          blockType: "articleColumns",
          left: paragraphsToRichText(["Left column"]),
          right: paragraphsToRichText(["Right column"]),
        },
        { blockType: "articleImage", image: photo, alt: "Custom alt", caption: "Our workshop" },
        { blockType: "articleButton", label: "Learn more", href: "https://example.test/services" },
      ])} />,
    );
    expect(html).toContain('data-article-layout="columns"');
    expect(html).toContain('data-article-layout="image"');
    expect(html).toContain('alt="Custom alt"');
    expect(html).toContain("<figcaption");
    expect(html).toContain("Our workshop");
    expect(html.indexOf("Left column")).toBeLessThan(html.indexOf("Right column"));
    expect(html.indexOf("Right column")).toBeLessThan(html.indexOf("Our workshop"));
    expect(html).toContain('href="https://example.test/services"');
  });

  it("keeps legacy paragraphs, inline formatting and embedded images readable", () => {
    const data = paragraphsToRichText(["Existing article"]);
    const boldParagraph = {
      ...data.root.children[0],
      children: [{ type: "text", text: "Existing article", version: 1, format: 1 }],
    };
    data.root.children[0] = boldParagraph;
    const upload: SerializedUploadNode = {
      type: "upload",
      version: 3,
      id: "legacy-upload",
      format: "",
      fields: {},
      relationTo: "media",
      value: photo,
    };
    data.root.children.push(upload);
    const html = renderToStaticMarkup(<NewsArticleContent data={data} />);
    expect(html).toContain("Existing article");
    expect(html).toContain("<strong>");
    expect(html).toContain('alt="Business advisory session"');
    expect(html).not.toContain("data-article-layout");
  });

  it("renders incomplete autosaved sections without broken links or crashes", () => {
    const html = renderToStaticMarkup(
      <NewsArticleContent data={article([
        { blockType: "articleTextImage", content: null },
        { blockType: "articleColumns", left: {}, right: undefined },
        { blockType: "articleImage" },
        { blockType: "articleButton", label: "Incomplete" },
      ])} />,
    );
    expect(html).not.toContain('href=');
    expect(html).not.toContain("<img");
  });

  it("does not render unsafe button links from stored content", () => {
    const html = renderToStaticMarkup(
      <NewsArticleContent data={article([
        { blockType: "articleButton", label: "Unsafe", href: "javascript:alert(1)" },
      ])} />,
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("Unsafe");
  });

  it.each(["/contact", "#advisory", "https://example.test/services", "http://example.test"])(
    "accepts supported button destinations: %s",
    (href) => {
      expect(articleLink(href)).toBe(href);
      expect(validateArticleLink(href)).toBe(true);
    },
  );

  it.each(["javascript:alert(1)", "//example.test", "/\\example.test", "https://user:pass@example.test", "data:text/html,test", "/bad\nlink"])(
    "rejects unsafe button destinations: %s",
    (href) => {
      expect(articleLink(href)).toBeUndefined();
      expect(validateArticleLink(href)).not.toBe(true);
    },
  );

  it("requires both parts of an optional section button before publication", async () => {
    const block = newsArticleBlocks.find((item) => item.slug === "articleTextImage");
    const button = block?.fields.find((field) => "name" in field && field.name === "button");
    if (!button || button.type !== "group" || !button.validate) {
      throw new Error("Missing optional section button validation");
    }
    expect(await button.validate({}, {} as never)).toBe(true);
    expect(await button.validate({ label: "Consultation" }, {} as never)).not.toBe(true);
    expect(await button.validate({ label: "Consultation", href: "/contact" }, {} as never)).toBe(true);
  });
});
