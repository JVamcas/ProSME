import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("pdf-parse", () => {
  throw new Error("PDF runtime unavailable");
});

import { extractChatbotDocumentText } from "@/modules/chatbot/infrastructure/ChatbotDocumentTextExtractor";

describe("document extraction with an unavailable PDF runtime", () => {
  it("still reads TXT and DOCX files", async () => {
    const text = await extractChatbotDocumentText(
      "guide.txt",
      Buffer.from("Public guidance"),
    );
    expect(text.text).toBe("Public guidance");

    const bytes = await readFile(
      new URL(
        "../../fixtures/chatbot/documents/programme-guide.docx",
        import.meta.url,
      ),
    );
    const document = await extractChatbotDocumentText("guide.docx", bytes);
    expect(document.text).toContain("approved public policy for small businesses");
  });

  it("returns the document validation error when PDF loading fails", async () => {
    await expect(
      extractChatbotDocumentText("guide.pdf", Buffer.from("%PDF-1.7")),
    ).rejects.toThrow("The document could not be read.");
  });
});
