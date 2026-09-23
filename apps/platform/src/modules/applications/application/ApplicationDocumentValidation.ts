import path from "node:path";

export function safeApplicationDocumentName(name: string) {
  const baseName = path.basename(name.replaceAll("\\", "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 240);
  return baseName || "document";
}

export function validApplicationDocumentSignature(
  body: Buffer,
  signature: string,
) {
  if (signature === "pdf") return body.subarray(0, 5).toString() === "%PDF-";
  if (signature === "png") {
    return body
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (signature === "jpeg") return body[0] === 0xff && body[1] === 0xd8;
  return body[0] === 0x50
    && body[1] === 0x4b
    && body.includes(Buffer.from("[Content_Types].xml"))
    && body.includes(Buffer.from("word/"));
}
