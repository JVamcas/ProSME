import { RequestValidationError } from "@/lib/resource-errors";
import { chatbotDocumentLimits } from "../domain/ChatbotDocument";
import { chatbotDocumentFileNameSchema } from "./ChatbotDocumentSchemas";

export async function chatbotDocumentBody(request: Request) {
  let fileName: string;
  try {
    fileName = chatbotDocumentFileNameSchema.parse(
      decodeURIComponent(request.headers.get("x-file-name") ?? ""),
    );
  } catch {
    throw new RequestValidationError(
      "Select a PDF, DOCX or TXT document with a valid file name.",
    );
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestValidationError("Select a document.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > chatbotDocumentLimits.fileBytes) {
        await reader.cancel();
        throw new RequestValidationError("Select a document up to 5 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return { fileName, bytes: Buffer.concat(chunks) };
}
