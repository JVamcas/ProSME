import "server-only";

export async function readApplicationDocumentPageCount(bytes: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  try {
    return (await parser.getInfo()).total;
  } finally {
    await parser.destroy();
  }
}
