import { RequestValidationError } from "@/lib/resource-errors";

// Inspect ZIP metadata before the Word parser inflates any document parts.
export function validateChatbotDocxArchive(bytes: Buffer) {
  const invalid = () =>
    new RequestValidationError(
      "Select a valid DOCX document up to 20 MB when unpacked.",
    );
  let end = -1;
  for (
    let offset = bytes.length - 22;
    offset >= Math.max(0, bytes.length - 65557);
    offset--
  ) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw invalid();
  const count = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  let expanded = 0;
  let hasDocument = false;
  if (count < 1 || count > 1000) throw invalid();
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50)
      throw invalid();
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    expanded += size;
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > end || expanded > 20 * 1024 * 1024) throw invalid();
    const name = bytes
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");
    if (name === "word/document.xml") hasDocument = true;
    offset = next;
  }
  if (!hasDocument) throw invalid();
}
