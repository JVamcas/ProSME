import { afterEach, describe, expect, it, vi } from "vitest";
import type { Media } from "@/payload-types";

vi.mock("server-only", () => ({}));

import { migrateCmsMedia } from "@/modules/content/ServerCmsMediaMigrationService";

const prefix = "media/b20395c3-d076-4f44-84a3-bf3c62da071d";
const body = Buffer.from("original image");

afterEach(() => vi.unstubAllEnvs());

function record(overrides: Partial<Media> = {}): Media {
  return {
    id: 165,
    alt: "Business owner",
    filename: "pic7.png",
    mimeType: "image/png",
    prefix: "",
    width: 1448,
    height: 1086,
    createdAt: "2026-09-30T21:13:46.538Z",
    updatedAt: "2026-10-05T19:00:00.247Z",
    ...overrides,
  };
}

function generatedSizes() {
  return {
    thumbnail: {
      filename: "pic7-320x240.webp",
      mimeType: "image/webp",
      width: 320,
      height: 240,
    },
    mobile: {
      filename: "pic7-640x480.webp",
      mimeType: "image/webp",
      width: 640,
      height: 480,
    },
    tablet: {
      filename: "pic7-1024x768.webp",
      mimeType: "image/webp",
      width: 1024,
      height: 768,
    },
    desktop: {
      filename: "pic7-1448x1086.webp",
      mimeType: "image/webp",
      width: 1448,
      height: 1086,
    },
  };
}

function dependencies(source = record(), updated = record({ prefix, sizes: generatedSizes() })) {
  vi.stubEnv("ENVIRONMENT", "local");
  const repository = {
    batch: vi.fn().mockResolvedValueOnce([source]).mockResolvedValue([]),
    replace: vi.fn().mockResolvedValue(updated),
  };
  const storage = {
    read: vi.fn().mockResolvedValue(body),
    put: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  return { repository, storage };
}

describe("forward CMS media migration", () => {
  it("regenerates media in its UUID folder and removes flat copies after verifying them", async () => {
    const source = record({ sizes: generatedSizes() });
    const deps = dependencies(source);
    const result = await migrateCmsMedia(deps);

    expect(result).toEqual({ migrated: 1, skipped: 0, failures: [] });
    expect(deps.repository.replace).toHaveBeenCalledWith(source, body);
    expect(deps.storage.read).toHaveBeenCalledWith("local/cms/pic7.png");
    expect(deps.storage.read).toHaveBeenCalledWith(`local/cms/${prefix}/pic7-320x240.webp`);
    expect(deps.storage.delete).toHaveBeenCalledWith("local/cms/pic7.png");
    expect(deps.storage.delete).toHaveBeenCalledWith("local/cms/pic7-1448x1086.webp");
    expect(deps.storage.delete).toHaveBeenCalledTimes(5);
    const lastRead = Math.max(...deps.storage.read.mock.invocationCallOrder);
    const firstDelete = Math.min(...deps.storage.delete.mock.invocationCallOrder);
    expect(firstDelete).toBeGreaterThan(lastRead);
  });

  it("is repeatable and skips completed records", async () => {
    const deps = dependencies(record({ prefix, sizes: generatedSizes() }));

    expect(await migrateCmsMedia(deps)).toEqual({ migrated: 0, skipped: 1, failures: [] });
    expect(deps.repository.replace).not.toHaveBeenCalled();
    expect(deps.storage.read).not.toHaveBeenCalled();
  });

  it("regenerates existing PNG variants while preserving IDs and original bytes", async () => {
    const legacySizes = Object.fromEntries(
      Object.entries(generatedSizes()).map(([name, size]) => [name, {
        ...size,
        filename: size.filename.replace(".webp", ".png"),
        mimeType: "image/png",
      }]),
    );
    const source = record({ prefix, sizes: legacySizes });
    const nextPrefix = "media/98df6c1d-f51e-4717-9917-d316b23ec4b6";
    const deps = dependencies(source, record({ prefix: nextPrefix, sizes: generatedSizes() }));

    expect(await migrateCmsMedia(deps)).toEqual({ migrated: 1, skipped: 0, failures: [] });
    expect(deps.repository.replace).toHaveBeenCalledWith(source, body);
    expect(deps.storage.delete).toHaveBeenCalledWith(`local/cms/${prefix}/pic7-320x240.png`);
  });

  it("does not remove the original if the uploaded bytes differ", async () => {
    const deps = dependencies();
    deps.storage.read.mockResolvedValueOnce(body).mockResolvedValue(Buffer.from("different"));

    expect((await migrateCmsMedia(deps)).failures).toEqual([165]);
    expect(deps.storage.delete).not.toHaveBeenCalled();
  });

  it("does not remove flat copies if a generated object is missing", async () => {
    const deps = dependencies();
    deps.storage.read.mockImplementation(async (key: string) => {
      if (key.endsWith("-320x240.webp")) {
        throw new Error("Missing object");
      }
      return body;
    });

    expect((await migrateCmsMedia(deps)).failures).toEqual([165]);
    expect(deps.storage.delete).not.toHaveBeenCalled();
  });

  it("regenerates missing sizes even for a record already in a UUID folder", async () => {
    const deps = dependencies(record({ prefix }));

    expect((await migrateCmsMedia(deps)).migrated).toBe(1);
    expect(deps.repository.replace).toHaveBeenCalled();
    expect(deps.storage.delete).not.toHaveBeenCalled();
  });

  it("moves PDFs without requiring image sizes", async () => {
    const source = record({ filename: "guide.pdf", mimeType: "application/pdf", width: null });
    const deps = dependencies(source, { ...source, prefix });

    expect((await migrateCmsMedia(deps)).migrated).toBe(1);
    expect(deps.storage.delete).toHaveBeenCalledWith("local/cms/guide.pdf");
  });

  it("restores a supplied original only when its stored metadata matches", async () => {
    const deps = dependencies(record({ filesize: body.length }));
    const sourceFiles = new Map([
      ["pic7.png", { body, width: 1448, height: 1086 }],
    ]);

    expect((await migrateCmsMedia({ ...deps, sourceFiles })).migrated).toBe(1);
    expect(deps.repository.replace).toHaveBeenCalledWith(expect.anything(), body);
    expect(deps.storage.read).not.toHaveBeenCalledWith("local/cms/pic7.png");
  });

  it("rejects mismatched restoration files before changing the record", async () => {
    const deps = dependencies(record({ filesize: 10 }));
    const sourceFiles = new Map([
      ["pic7.png", { body, width: 1448, height: 1086 }],
    ]);

    expect((await migrateCmsMedia({ ...deps, sourceFiles })).failures).toEqual([165]);
    expect(deps.repository.replace).not.toHaveBeenCalled();
  });

  it("uses bounded ID batches and reports missing originals without dropping records", async () => {
    const source = record();
    const next = record({ id: 166, prefix, sizes: generatedSizes() });
    const deps = dependencies(source);
    deps.repository.batch.mockReset();
    deps.repository.batch.mockResolvedValueOnce([source]).mockResolvedValueOnce([next]).mockResolvedValue([]);
    deps.storage.read.mockRejectedValueOnce(new Error("Original not found"));

    expect(await migrateCmsMedia(deps)).toEqual({ migrated: 0, skipped: 1, failures: [165] });
    expect(deps.repository.batch.mock.calls).toEqual([[0], [165], [166]]);
    expect(deps.repository.replace).not.toHaveBeenCalled();
    expect(deps.storage.delete).not.toHaveBeenCalled();
  });
});
