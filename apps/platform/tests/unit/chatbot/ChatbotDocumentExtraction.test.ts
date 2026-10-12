import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { extractChatbotDocumentText } from "@/modules/chatbot/infrastructure/ChatbotDocumentTextExtractor";
import { validateChatbotDocxArchive } from "@/modules/chatbot/infrastructure/ChatbotDocxArchiveValidation";
import { prepareDocumentKnowledge } from "@/modules/chatbot/application/PrepareDocumentKnowledge";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";

describe("knowledge document extraction", () => {
  it.each(["pdf", "docx"])(
    "extracts readable text from a real %s file",
    async (extension) => {
      const bytes = await readFile(
        new URL(
          `../../fixtures/chatbot/documents/programme-guide.${extension}`,
          import.meta.url,
        ),
      );
      const result = await extractChatbotDocumentText(
        `programme-guide.${extension}`,
        bytes,
      );
      expect(result.text).toContain(
        "approved public policy for small businesses",
      );
    },
  );
  it("decodes UTF-8 text and rejects corrupt or mismatched formats", async () => {
    expect(
      (
        await extractChatbotDocumentText(
          "guide.txt",
          Buffer.from("Public guidance"),
        )
      ).text,
    ).toBe("Public guidance");
    await expect(
      extractChatbotDocumentText("guide.pdf", Buffer.from("Plain text")),
    ).rejects.toThrow("contents do not match");
    await expect(
      extractChatbotDocumentText("guide.docx", Buffer.from("P")),
    ).rejects.toThrow();
    await expect(
      extractChatbotDocumentText("guide.txt", Buffer.from([0xff])),
    ).rejects.toThrow("could not be read");
  });
  it("rejects excessive ZIP expansion before Word extraction", async () => {
    const bytes = await readFile(
      new URL(
        "../../fixtures/chatbot/documents/programme-guide.docx",
        import.meta.url,
      ),
    );
    const central = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    bytes.writeUInt32LE(21 * 1024 * 1024, central + 24);
    expect(() => validateChatbotDocxArchive(bytes)).toThrow("unpacked");
  });
  it("chunks document knowledge with a public citation and stable source fingerprint", () => {
    const text = "Programme policy. ".repeat(1500);
    const result = prepareDocumentKnowledge({
      id: chatbotId(700),
      name: "Policy",
      contentHash: "a".repeat(64),
      text,
    });
    expect(result.records.length).toBeGreaterThan(1);
    expect(result.records.map((record) => record.text).join("")).toBe(text);
    expect(
      result.records.every(
        (record) => record.text.length <= 8000 && record.scope === null,
      ),
    ).toBe(true);
    expect(result.source).toMatchObject({
      kind: "document",
      fingerprint: "a".repeat(64),
      url: `/api/public/chatbot/documents/${chatbotId(700)}`,
    });
  });
});
