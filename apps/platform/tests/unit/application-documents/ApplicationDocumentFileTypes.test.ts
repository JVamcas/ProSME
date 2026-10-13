import { describe, expect, it } from "vitest";
import { validApplicationDocumentSignature } from "@/modules/applications/application/ApplicationDocumentValidation";
import { documentMimeTypeMatches } from "@/modules/forms/domain/FormDocumentTypes";

describe("document format validation", () => {
  it.each(["docx", "xlsx"])("checks the %s archive directory", (signature) => {
    const directory = signature === "docx" ? "word/" : "xl/";
    const bytes = Buffer.from(`PK\u0003\u0004[Content_Types].xml ${directory}`);
    expect(validApplicationDocumentSignature(bytes, signature)).toBe(true);
    expect(
      validApplicationDocumentSignature(
        bytes,
        signature === "docx" ? "xlsx" : "docx",
      ),
    ).toBe(false);
  });

  it("checks the XLS compound header and workbook stream", () => {
    const header = Buffer.from([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
    ]);
    const workbook = Buffer.concat([
      header,
      Buffer.from("Workbook\u0000", "utf16le"),
    ]);
    expect(validApplicationDocumentSignature(workbook, "xls")).toBe(true);
    expect(validApplicationDocumentSignature(header, "xls")).toBe(false);
    expect(
      validApplicationDocumentSignature(Buffer.from("not a workbook"), "xls"),
    ).toBe(false);
  });

  it("accepts UTF-8 text and CSV and rejects binary or invalid encoding", () => {
    expect(
      validApplicationDocumentSignature(
        Buffer.from("Name,Amount\nBusiness,500"),
        "text",
      ),
    ).toBe(true);
    expect(
      validApplicationDocumentSignature(Buffer.from("Résumé\r\n"), "text"),
    ).toBe(true);
    expect(
      validApplicationDocumentSignature(Buffer.from([0, 1, 2]), "text"),
    ).toBe(false);
    expect(
      validApplicationDocumentSignature(Buffer.from([0xff, 0xfe]), "text"),
    ).toBe(false);
  });

  it("handles browser CSV MIME variants while rejecting a conflicting type", () => {
    expect(documentMimeTypeMatches(".csv", "application/vnd.ms-excel")).toBe(
      true,
    );
    expect(documentMimeTypeMatches(".csv", "text/plain")).toBe(true);
    expect(documentMimeTypeMatches(".xlsx", "application/octet-stream")).toBe(
      true,
    );
    expect(documentMimeTypeMatches(".txt", "application/pdf")).toBe(false);
  });
});
