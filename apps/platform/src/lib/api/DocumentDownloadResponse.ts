type DocumentDownload = {
  body: Buffer;
  contentType: string;
  fileName: string;
};

function safeAttachmentName(fileName: string) {
  const safeName = fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\\r\n]/g, "_")
    .trim();
  return safeName || "download";
}

export function documentDownloadResponse(download: DocumentDownload) {
  return new Response(new Uint8Array(download.body), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${safeAttachmentName(download.fileName)}"`,
      "Content-Length": String(download.body.byteLength),
      "Content-Type": download.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
