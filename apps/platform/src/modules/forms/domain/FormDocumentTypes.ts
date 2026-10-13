export const formDocumentExtensions = [
  ".pdf",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
] as const;

export type FormDocumentExtension = (typeof formDocumentExtensions)[number];

export const defaultFormDocumentExtensions: FormDocumentExtension[] = [
  ".docx",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
];

export const formDocumentFileTypes = {
  ".pdf": { contentType: "application/pdf", signature: "pdf" },
  ".docx": {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    signature: "docx",
  },
  ".xls": { contentType: "application/vnd.ms-excel", signature: "xls" },
  ".xlsx": {
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    signature: "xlsx",
  },
  ".txt": { contentType: "text/plain", signature: "text" },
  ".csv": { contentType: "text/csv", signature: "text" },
  ".jpg": { contentType: "image/jpeg", signature: "jpeg" },
  ".jpeg": { contentType: "image/jpeg", signature: "jpeg" },
  ".png": { contentType: "image/png", signature: "png" },
} as const;

export function documentMimeTypeMatches(
  extension: FormDocumentExtension,
  contentType: string,
) {
  if (!contentType || contentType === "application/octet-stream") return true;
  if (contentType === formDocumentFileTypes[extension].contentType) return true;
  return (
    extension === ".csv" &&
    ["text/plain", "application/csv", "application/vnd.ms-excel"].includes(
      contentType,
    )
  );
}
