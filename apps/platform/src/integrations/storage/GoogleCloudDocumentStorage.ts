import "server-only";

import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import type { StreamingDocumentStorage } from "./StreamingDocumentStorage";

import { Storage } from "@google-cloud/storage";

import { getServerEnvironment } from "@/lib/env/server";
import { getGoogleCloudStorageOptions } from "./GoogleCloudStorageOptions";
import type { StoredDocument } from "./DocumentStorage";

let storage: Storage | undefined;

function client() {
  storage ??= new Storage(getGoogleCloudStorageOptions());
  return storage;
}

function bucketName() {
  const name = getServerEnvironment().GCS_DOCUMENTS_BUCKET;
  if (!name) {
    throw new Error("GCS_DOCUMENTS_BUCKET is required for document storage.");
  }
  return name;
}

export class GoogleCloudDocumentStorage implements StreamingDocumentStorage {
  async putStream(document: {
    body: Readable;
    objectKey: string;
    contentType: string;
    signal: AbortSignal;
  }) {
    const destination = client()
      .bucket(bucketName())
      .file(document.objectKey)
      .createWriteStream({
        resumable: false,
        validation: "crc32c",
        metadata: { contentType: document.contentType },
      });
    await pipeline(document.body, destination, { signal: document.signal });
  }

  readStream(objectKey: string) {
    return client().bucket(bucketName()).file(objectKey).createReadStream();
  }

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

  async read(objectKey: string) {
    const [body] = await client()
      .bucket(bucketName())
      .file(objectKey)
      .download();
    return body;
  }
}
