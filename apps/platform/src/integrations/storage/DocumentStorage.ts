import "server-only";

export type StoredDocument = {
  body: Buffer;
  contentType: string;
  objectKey: string;
};

export interface DocumentStorage {
  delete(objectKey: string): Promise<void>;
  put(document: StoredDocument): Promise<void>;
}
