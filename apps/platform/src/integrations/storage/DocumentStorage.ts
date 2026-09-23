import "server-only";

export type StoredDocument = {
  body: Buffer;
  contentType: string;
  objectKey: string;
};

export interface DocumentStorage {
  createSignedDownloadUrl(input: {
    expiresAt: Date;
    fileName: string;
    objectKey: string;
  }): Promise<string>;
  delete(objectKey: string): Promise<void>;
  put(document: StoredDocument): Promise<void>;
}
