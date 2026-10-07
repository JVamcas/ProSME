import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const maxEntryBytes = 2 * 1024 * 1024;
const maxCacheBytes = 128 * 1024 * 1024;
const maxCacheEntries = 512;
const metadataSchema = z.object({
  headers: z.array(z.tuple([z.string(), z.string()])),
});

export type CachedCmsImage = {
  body: Buffer;
  headers: [string, string][];
};

/** Disposable, bounded cache; GCS remains the source of truth. */
export class CmsMediaDeliveryCache {
  private pruning?: Promise<void>;

  constructor(private readonly directory: string) {}

  private filename(key: string) {
    const digest = createHash("sha256").update(key).digest("hex");
    return path.join(this.directory, `${digest}.image`);
  }

  async read(key: string): Promise<CachedCmsImage | undefined> {
    const filename = this.filename(key);
    try {
      const info = await stat(filename);
      if (info.size < 4 || info.size > maxEntryBytes + 16_384) {
        await rm(filename, { force: true });
        return undefined;
      }
      const entry = await readFile(filename);
      const metadataLength = entry.readUInt32BE(0);
      if (metadataLength > 16_384 || metadataLength + 4 > entry.length) {
        await rm(filename, { force: true });
        return undefined;
      }
      const metadata = metadataSchema.parse(
        JSON.parse(entry.subarray(4, 4 + metadataLength).toString("utf8")),
      );
      return { ...metadata, body: entry.subarray(4 + metadataLength) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      // Invalid or inaccessible cache entries must never prevent GCS delivery.
      await rm(filename, { force: true }).catch(() => undefined);
      return undefined;
    }
  }

  async write(key: string, image: CachedCmsImage) {
    if (image.body.length > maxEntryBytes) {
      return;
    }
    const metadata = Buffer.from(JSON.stringify({ headers: image.headers }));
    if (metadata.length > 16_384) {
      return;
    }
    const metadataLength = Buffer.alloc(4);
    metadataLength.writeUInt32BE(metadata.length);
    const filename = this.filename(key);
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
      await mkdir(this.directory, { recursive: true });
      await writeFile(temporary, Buffer.concat([metadataLength, metadata, image.body]));
      await rename(temporary, filename);
      // Atomic rename means replacement processes never see a partial entry.
      this.pruning ??= this.prune().finally(() => {
        this.pruning = undefined;
      });
      await this.pruning;
    } finally {
      await rm(temporary, { force: true });
    }
  }

  private async prune() {
    const allFilenames = await readdir(this.directory);
    // A terminated process may leave a staging file. Keep active writes safe
    // while reclaiming old staging files on the next successful cache write.
    const abandoned = allFilenames.filter((filename) =>
      /^[a-f0-9]{64}\.[a-f0-9-]{36}\.tmp$/.test(filename),
    );
    await Promise.all(abandoned.map(async (filename) => {
      const target = path.join(this.directory, filename);
      const info = await stat(target).catch(() => undefined);
      if (info && Date.now() - info.mtimeMs > 10 * 60 * 1000) {
        await rm(target, { force: true });
      }
    }));
    const filenames = allFilenames
      .filter((filename) => /^[a-f0-9]{64}\.image$/.test(filename));
    const entries = await Promise.all(filenames.map(async (filename) => {
      const target = path.join(this.directory, filename);
      const info = await stat(target).catch(() => undefined);
      return info ? { target, bytes: info.size, modified: info.mtimeMs } : undefined;
    }));
    const oldestFirst = entries
      .filter((entry) => entry !== undefined)
      .sort((left, right) => left.modified - right.modified);
    let bytes = oldestFirst.reduce((total, entry) => total + entry.bytes, 0);
    let count = oldestFirst.length;
    for (const entry of oldestFirst) {
      if (bytes <= maxCacheBytes && count <= maxCacheEntries) {
        break;
      }
      await rm(entry.target, { force: true });
      bytes -= entry.bytes;
      count -= 1;
    }
  }
}
