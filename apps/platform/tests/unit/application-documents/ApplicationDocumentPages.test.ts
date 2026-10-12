import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { validateApplicationDocumentPages } from "@/modules/applications/application/ApplicationDocumentPageValidation";

function blankPdf(pageCount: number) {
  const kids = Array.from(
    { length: pageCount },
    (_, index) => `${index + 3} 0 R`,
  );
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pageCount} /Kids [${kids.join(" ")}] >>`,
    ...kids.map(
      () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
    ),
  ];
  let pdf = "%PDF-1.7\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

describe("real PDF page validation", () => {
  it.each([5, 12])(
    "accepts exactly %i pages using the installed parser",
    async (maxPages) => {
      await expect(
        validateApplicationDocumentPages(blankPdf(maxPages), maxPages),
      ).resolves.toBeUndefined();
    },
  );

  it.each([5, 12])(
    "rejects one page above %i using the installed parser",
    async (maxPages) => {
      await expect(
        validateApplicationDocumentPages(blankPdf(maxPages + 1), maxPages),
      ).rejects.toThrow(`This document has ${maxPages + 1} pages`);
    },
  );

  it("rejects a broken PDF", async () => {
    await expect(
      validateApplicationDocumentPages(Buffer.from("%PDF-1.7\nbroken"), 5),
    ).rejects.toThrow("The page count could not be read");
  });

  it("does not parse documents without a configured limit", async () => {
    await expect(
      validateApplicationDocumentPages(Buffer.from("DOCX bytes")),
    ).resolves.toBeUndefined();
  });
});
