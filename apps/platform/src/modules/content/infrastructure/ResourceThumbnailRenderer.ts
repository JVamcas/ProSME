import "server-only";

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { resourceDocumentExtensions } from "../ResourceDocumentTypes";

const runFile = promisify(execFile);
const commandOptions = { timeout: 60_000, maxBuffer: 1024 * 1024 };

// Render actual first-page content in a private workspace, never via a shell.
export async function renderResourceThumbnail(
  data: Buffer,
  mimeType: string,
): Promise<Buffer> {
  const extension = resourceDocumentExtensions[mimeType];
  if (!extension) {
    throw new Error("This document format cannot be previewed.");
  }

  const directory = await mkdtemp(path.join(tmpdir(), "cms-resource-preview-"));
  try {
    const input = path.join(directory, `document${extension}`);
    await writeFile(input, data);
    const pdf = path.join(directory, "document.pdf");

    if (extension !== ".pdf") {
      await runFile("libreoffice", [
        `-env:UserInstallation=${pathToFileURL(path.join(directory, "profile")).href}`,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        directory,
        input,
      ], commandOptions);
    }

    const output = path.join(directory, "preview");
    await runFile("pdftoppm", [
      "-f", "1",
      "-l", "1",
      "-singlefile",
      "-scale-to", "1024",
      "-png",
      pdf,
      output,
    ], commandOptions);
    return await readFile(`${output}.png`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
