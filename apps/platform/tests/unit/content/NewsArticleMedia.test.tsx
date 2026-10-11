import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({
  getPayload: async () => ({
    find: async (query: { populate: { media: Record<string, boolean> } }) => {
      const project = (record: Record<string, unknown>) => Object.fromEntries(
        Object.entries(record).filter(([key]) => query.populate.media[key]),
      );
      const body = {
        root: {
          type: "root",
          version: 1,
          direction: null,
          format: "",
          indent: 0,
          children: [
            {
              type: "upload",
              version: 3,
              relationTo: "media",
              value: project({
                url: "/api/media/file/photo.jpg",
                alt: "Article body photo",
                mimeType: "image/jpeg",
                width: 1200,
                height: 800,
                sizes: { mobile: { url: "/api/media/file/photo-mobile.webp", width: 640 } },
              }),
            },
            {
              type: "upload",
              version: 3,
              relationTo: "media",
              value: project({
                url: "/api/media/file/guide.pdf",
                filename: "guide.pdf",
                mimeType: "application/pdf",
              }),
            },
          ],
        },
      };
      return { docs: [{ body }] };
    },
  }),
}));

import { readNewsById } from "@/modules/content/infrastructure/PayloadContentRepository";
import { CmsRichText } from "@/modules/content/ui/public/CmsRichText";

describe("published news body media projection", () => {
  it("renders embedded images and downloads using the article query's media fields", async () => {
    const article = await readNewsById(42, {
      draft: false,
      where: { _status: { equals: "published" } },
    });
    const html = renderToStaticMarkup(
      <CmsRichText data={article!.body as SerializedEditorState} />,
    );
    expect(html).toContain('alt="Article body photo"');
    expect(html).toContain("photo-mobile.webp");
    expect(html).toContain('href="/api/media/file/guide.pdf"');
    expect(html).toContain("guide.pdf");
  });
});
