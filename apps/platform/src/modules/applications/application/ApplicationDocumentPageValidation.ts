import "server-only";

import { RequestValidationError } from "@/lib/resource-errors";
import { readApplicationDocumentPageCount } from "../infrastructure/ApplicationDocumentPageReader";

export async function validateApplicationDocumentPages(
  bytes: Buffer,
  maximumPages?: number,
) {
  if (maximumPages === undefined) return;

  let pages: number;
  try {
    pages = await readApplicationDocumentPageCount(bytes);
    if (!Number.isInteger(pages) || pages < 1) {
      throw new Error("Invalid page count");
    }
  } catch {
    throw new RequestValidationError(
      "The page count could not be read. Upload a readable PDF without password protection.",
    );
  }

  if (pages > maximumPages) {
    throw new RequestValidationError(
      `This document has ${pages} pages. The maximum is ${maximumPages} pages.`,
    );
  }
}
