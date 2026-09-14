import "server-only";

import { Storage } from "@google-cloud/storage";

import { getServerEnvironment } from "@/lib/env/server";
import type {
  DocumentStorage,
  StoredDocument,
} from "./DocumentStorage";

let storage: Storage | undefined;

function client() {
  storage ??= new Storage();
  return storage;
}

function bucketName() {
  const name = getServerEnvironment().GCS_DOCUMENTS_BUCKET;
  if (!name) {
    throw new Error("GCS_DOCUMENTS_BUCKET is required for document storage.");
  }
  return name;
}

export class GoogleCloudDocumentStorage implements DocumentStorage {
  async put(document: StoredDocument) {
    const bucket = client().bucket(bucketName());
    await bucket.file(document.objectKey).save(document.body, {
      contentType: document.contentType,
      resumable: false,
      validation: "crc32c",
    });
  }

  async delete(objectKey: string) {
    const bucket = client().bucket(bucketName());
    await bucket.file(objectKey).delete({ ignoreNotFound: true });
  }
}
