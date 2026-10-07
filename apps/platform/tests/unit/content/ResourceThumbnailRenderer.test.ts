import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  run: vi.fn(),
  mkdir: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("node:util", () => ({ promisify: () => state.run }));
vi.mock("node:fs/promises", () => ({
  mkdtemp: state.mkdir, readFile: state.read, writeFile: state.write, rm: state.remove,
}));

import { renderResourceThumbnail } from "@/modules/content/infrastructure/ResourceThumbnailRenderer";

beforeEach(() => {
  vi.clearAllMocks();
  state.mkdir.mockResolvedValue("/tmp/cms-resource-preview-unique");
  state.read.mockResolvedValue(Buffer.from("PNG preview"));
  state.run.mockResolvedValue({ stdout: "", stderr: "" });
});

describe("Resource first-page renderer", () => {
  it("renders only the first PDF page at bounded resolution without a shell", async () => {
    await renderResourceThumbnail(Buffer.from("PDF"), "application/pdf");
    expect(state.run).toHaveBeenCalledExactlyOnceWith("pdftoppm", [
      "-f", "1", "-l", "1", "-singlefile", "-scale-to", "1024", "-png",
      "/tmp/cms-resource-preview-unique/document.pdf",
      "/tmp/cms-resource-preview-unique/preview",
    ], expect.objectContaining({ timeout: 60_000 }));
    expect(state.remove).toHaveBeenCalledWith("/tmp/cms-resource-preview-unique", {
      recursive: true, force: true,
    });
  });

  it.each([
    ["application/msword", ".doc"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
    ["application/vnd.ms-excel", ".xls"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ])("converts %s before rendering with a separate LibreOffice profile", async (mimeType, extension) => {
    await renderResourceThumbnail(Buffer.from("Office document"), mimeType);
    expect(state.write).toHaveBeenCalledWith(
      `/tmp/cms-resource-preview-unique/document${extension}`, expect.any(Buffer),
    );
    expect(state.run.mock.calls[0]).toEqual([
      "libreoffice",
      expect.arrayContaining([
        "-env:UserInstallation=file:///tmp/cms-resource-preview-unique/profile",
        "--headless", "--convert-to", "pdf",
      ]),
      expect.objectContaining({ timeout: 60_000 }),
    ]);
    expect(state.run.mock.calls[1][0]).toBe("pdftoppm");
  });

  it("cleans up input and output files when conversion fails or times out", async () => {
    state.run.mockRejectedValue(new Error("Conversion timed out"));
    await expect(renderResourceThumbnail(Buffer.from("DOC"), "application/msword"))
      .rejects.toThrow("Conversion timed out");
    expect(state.remove).toHaveBeenCalledOnce();
  });

  it("rejects unsupported formats before creating a temporary directory", async () => {
    await expect(renderResourceThumbnail(Buffer.from("FILE"), "application/zip"))
      .rejects.toThrow("cannot be previewed");
    expect(state.mkdir).not.toHaveBeenCalled();
  });
});
