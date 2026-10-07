import { beforeEach, describe, expect, it, vi } from "vitest";

import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { resourcePageNumber } from "@/modules/content/ResourceCentreTypes";
import { resourceHref, resourceThumbnail } from "@/modules/content/infrastructure/ContentProjection";

const state = vi.hoisted(() => ({
  find: vi.fn(),
  draftMode: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({ getPayload: async () => ({ find: state.find }) }));
vi.mock("next/headers", () => ({ draftMode: state.draftMode }));
vi.mock("@/auth/authorization/current-user", () => ({ getCurrentUser: state.currentUser }));

import { getResource, getResourcePage, getResourceSitemapEntries } from "@/modules/content/ServerResourceCentreService";

const document = {
  url: "/documents/guide.pdf",
  mimeType: "application/pdf",
  documentThumbnail: { url: "/media/preview.png", alt: "First page" },
};

beforeEach(() => {
  vi.clearAllMocks();
  state.draftMode.mockResolvedValue({ isEnabled: false });
  state.currentUser.mockResolvedValue(null);
  state.find.mockResolvedValue({
    docs: [{
      id: 31,
      resourceName: "Application guide",
      title: "Funding criteria",
      slug: "funding-criteria",
      description: "Approved guidance",
      file: document,
    }],
    totalDocs: 31,
    totalPages: 3,
    hasNextPage: false,
  });
});

describe("Resource Centre server queries", () => {
  it("passes page, limit, projections and deterministic ordering to the database", async () => {
    const result = await getResourcePage("3");
    expect(state.find).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      collection: "resources",
      page: 3,
      limit: 12,
      pagination: true,
      draft: false,
      depth: 2,
      where: { _status: { equals: "published" } },
      sort: ["-publishedAt", "-createdAt", "-id"],
    }));
    const query = state.find.mock.calls[0][0];
    expect(query.select).not.toHaveProperty("body");
    expect(query.populate.media.documentThumbnail).toBe(true);
    expect(result).toMatchObject({ page: 3, total: 31, totalPages: 3, hasNextPage: false });
    expect(result.items[0]).toMatchObject({
      category: "Application guide",
      href: "/documents/guide.pdf",
      image: { url: "/media/preview.png" },
    });
  });

  it("keeps public results published when a draft cookie belongs to an unauthorized actor", async () => {
    state.draftMode.mockResolvedValue({ isEnabled: true });
    state.currentUser.mockResolvedValue({
      status: "active",
      capabilities: new Set([cmsPermissionCode("news", "read")]),
    });
    await getResourcePage("1");
    expect(state.find.mock.calls[0][0]).toMatchObject({
      draft: false,
      where: { _status: { equals: "published" } },
    });
  });

  it("allows draft preview only with the contextual resource read grant", async () => {
    state.draftMode.mockResolvedValue({ isEnabled: true });
    state.currentUser.mockResolvedValue({
      status: "active",
      capabilities: new Set([cmsPermissionCode("resources", "read")]),
    });
    await getResourcePage("1");
    expect(state.find.mock.calls[0][0]).toMatchObject({ draft: true, where: {} });
  });

  it("queries a detail by slug directly, including resources beyond the first page", async () => {
    await getResource("funding-criteria");
    expect(state.find.mock.calls[0][0]).toMatchObject({
      limit: 1,
      pagination: false,
      where: { and: [
        { _status: { equals: "published" } },
        { slug: { equals: "funding-criteria" } },
      ] },
      select: { body: true },
    });
  });

  it("returns null for an unknown or unpublished detail", async () => {
    state.find.mockResolvedValue({ docs: [] });
    await expect(getResource("missing")).resolves.toBeNull();
  });

  it("projects indexable published resource URLs independently of listing pages and preview mode", async () => {
    state.draftMode.mockResolvedValue({ isEnabled: true });
    await getResourceSitemapEntries();
    expect(state.find.mock.calls[0][0]).toMatchObject({
      depth: 0,
      draft: false,
      select: { slug: true, updatedAt: true },
      where: { and: [
        { _status: { equals: "published" } },
        { excludeFromSearch: { not_equals: true } },
      ] },
    });
  });

  it.each([undefined, ["2"], "0", "-1", "1.5", "Infinity", "100001", "9007199254740992"])(
    "normalizes an invalid page %j to one", (value) => {
      expect(resourcePageNumber(value)).toBe(1);
    },
  );
});

describe("Resource thumbnail selection", () => {
  it("uses a custom image until the editor clears it", () => {
    expect(resourceThumbnail({ url: "/media/custom.png" }, document)?.url).toBe("/media/custom.png");
    expect(resourceThumbnail(null, document)?.url).toBe("/media/preview.png");
  });

  it("uses the original image for JPEG and PNG resources", () => {
    expect(resourceThumbnail(null, { url: "/media/photo.jpg", mimeType: "image/jpeg" })?.url)
      .toBe("/media/photo.jpg");
  });

  it("does not treat a document URL as an image or display an unresolved relation", () => {
    expect(resourceThumbnail(null, { url: "/media/guide.pdf", mimeType: "application/pdf" }))
      .toBeUndefined();
    expect(resourceThumbnail(null, 3)).toBeUndefined();
  });

  it("uses a replacement upload ahead of an old external link", () => {
    expect(resourceHref(document, "/old.pdf")).toBe(document.url);
    expect(resourceHref(null, "/old.pdf")).toBe("/old.pdf");
  });
});
