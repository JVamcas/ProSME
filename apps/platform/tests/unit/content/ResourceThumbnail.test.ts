import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionBeforeChangeHook, PayloadRequest } from "payload";

const state = vi.hoisted(() => ({ render: vi.fn(), create: vi.fn(), log: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("payload", () => ({ APIError: class extends Error {} }));
vi.mock("@/modules/content/infrastructure/ResourceThumbnailRenderer", () => ({
  renderResourceThumbnail: state.render,
}));

import { generateDocumentThumbnail } from "@/modules/content/ServerResourceThumbnailService";

const file = { data: Buffer.from("PDF data"), mimetype: "application/pdf", name: "guide.pdf", size: 8 };

function input(data: Record<string, unknown> = {}, originalDoc?: Record<string, unknown>) {
  const req = {
    file,
    transactionID: "upload-transaction",
    user: { capabilities: ["cms.media.create"] },
    payload: { create: state.create, logger: { error: state.log } },
  } as unknown as PayloadRequest;
  return { data, originalDoc, req } as Parameters<CollectionBeforeChangeHook>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  state.render.mockResolvedValue(Buffer.from("preview"));
  state.create.mockResolvedValue({ id: 27 });
});

describe("Document thumbnail generation", () => {
  it("saves a generated PNG with the same authenticated request and transaction", async () => {
    const args = input({ alt: "Application guide" });
    const result = await generateDocumentThumbnail(args);
    expect(result.documentThumbnail).toBe(27);
    expect(state.render).toHaveBeenCalledWith(file.data, file.mimetype);
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: "media",
      data: { alt: "First page of Application guide" },
      overrideAccess: false,
      req: args.req,
      file: expect.objectContaining({ mimetype: "image/png", name: "document-preview.png" }),
    }));
  });

  it("restores the parent file after a nested Payload upload changes it", async () => {
    const args = input();
    state.create.mockImplementation(async () => {
      args.req.file = { ...file, mimetype: "image/png" };
      return { id: 27 };
    });
    await generateDocumentThumbnail(args);
    expect(args.req.file).toBe(file);
  });

  it("replaces the old preview when the document changes", async () => {
    expect((await generateDocumentThumbnail(input({}, { documentThumbnail: 11 }))).documentThumbnail)
      .toBe(27);
  });

  it("keeps the existing generated relation on metadata edits and ignores client assignments", async () => {
    const args = input({ documentThumbnail: 999 }, { documentThumbnail: 11 });
    args.req.file = undefined;
    expect((await generateDocumentThumbnail(args)).documentThumbnail).toBe(11);
    expect(state.render).not.toHaveBeenCalled();
  });

  it("uses an uploaded image itself without recursively generating previews", async () => {
    const args = input({}, { documentThumbnail: 11 });
    args.req.file = { ...file, mimetype: "image/png" };
    expect((await generateDocumentThumbnail(args)).documentThumbnail).toBeNull();
    expect(state.render).not.toHaveBeenCalled();
    expect(state.create).not.toHaveBeenCalled();
  });

  it("fails visibly if rendering fails, without saving a broken thumbnail relation", async () => {
    state.render.mockRejectedValue(new Error("Unreadable document"));
    const args = input();
    await expect(generateDocumentThumbnail(args)).rejects.toThrow("preview could not be generated");
    expect(state.create).not.toHaveBeenCalled();
    expect(args.req.file).toBe(file);
  });

  it("honors a rejected media-create permission and restores the parent file", async () => {
    state.create.mockRejectedValue(new Error("Forbidden"));
    const args = input();
    await expect(generateDocumentThumbnail(args)).rejects.toThrow("preview could not be generated");
    expect(args.req.file).toBe(file);
  });
});
