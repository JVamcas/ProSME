import "server-only";
import mammoth from "mammoth";
import { RequestValidationError } from "@/lib/resource-errors";
import { chatbotDocumentLimits } from "../domain/ChatbotDocument";
import { validateChatbotDocxArchive } from "./ChatbotDocxArchiveValidation";

async function pdfText(bytes: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    const info = await parser.getInfo();
    if (info.total > chatbotDocumentLimits.pdfPages) {
      throw new RequestValidationError("Select a PDF with at most 100 pages.");
    }
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
}

export async function extractChatbotDocumentText(
  fileName: string,
  bytes: Buffer,
) {
  try {
    if (
      /\.pdf$/i.test(fileName) &&
      bytes.subarray(0, 5).toString() === "%PDF-"
    ) {
      return { text: await pdfText(bytes), contentType: "application/pdf" };
    }
    if (
      /\.docx$/i.test(fileName) &&
      bytes.length >= 2 &&
      bytes.readUInt16BE(0) === 0x504b
    ) {
      validateChatbotDocxArchive(bytes);
      return {
        text: (await mammoth.extractRawText({ buffer: bytes })).value,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
    if (/\.txt$/i.test(fileName)) {
      return {
        text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        contentType: "text/plain",
      };
    }
  } catch (error) {
    if (error instanceof RequestValidationError) throw error;
    throw new RequestValidationError(
      "The document could not be read. Select a readable PDF, DOCX or UTF-8 TXT file.",
    );
  }
  throw new RequestValidationError(
    "The file contents do not match a supported document type.",
  );
}
