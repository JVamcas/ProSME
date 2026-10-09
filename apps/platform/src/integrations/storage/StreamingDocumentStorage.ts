import "server-only";
import type { Readable } from "node:stream";
import type { DocumentStorage } from "./DocumentStorage";

export interface StreamingDocumentStorage extends DocumentStorage {
  putStream(document: {
    body: Readable;
    objectKey: string;
    contentType: string;
    signal: AbortSignal;
  }): Promise<void>;
  readStream(objectKey: string): Readable;
}
