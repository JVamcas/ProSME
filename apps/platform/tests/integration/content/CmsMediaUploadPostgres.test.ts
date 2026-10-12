import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import type { Storage as StorageType } from "@google-cloud/storage";
import { gcsStorage } from "@payloadcms/storage-gcs";
import pg from "pg";
import { buildConfig, getPayload, handleEndpoints, type Payload } from "payload";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { Media } from "@/payload/collections/content/Media";
import { createPayloadPostgresAdapter } from "@/platform/database/PayloadPostgresAdapter";

const connectionString = process.env.CMS_UPLOAD_TEST_DATABASE_URL;
const save = vi.fn(async () => delay(150));
type CmsPostgresAdapter = Payload["db"] & { pool: pg.Pool };

describe.skipIf(!connectionString)("CMS media uploads on disposable PostgreSQL", () => {
  let payload: Payload;
  let image: Buffer;
  let poolConstructor: typeof pg.Pool;
  let constructorName: PropertyDescriptor | undefined;

  beforeAll(async () => {
    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
      const tables = await client.query(
        "SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public') AS populated",
      );
      if (tables.rows[0].populated) {
        throw new Error("CMS upload tests require an empty disposable database");
      }
    } finally {
      await client.end();
    }

    // The GCS plugin has its own storage dependency and uses its ESM entry.
    const require = createRequire(import.meta.url);
    const storageRequire = createRequire(require.resolve("@payloadcms/storage-gcs"));
    const storagePath = storageRequire.resolve("@google-cloud/storage")
      .replace("/build/cjs/", "/build/esm/");
    const { Storage } = await import(storagePath) as { Storage: typeof StorageType };
    vi.spyOn(Storage.prototype, "bucket").mockReturnValue({
      file: () => ({ save, delete: async () => {} }),
    } as unknown as ReturnType<StorageType["bucket"]>);

    payload = await getPayload({
      config: buildConfig({
        secret: "synthetic-cms-upload-regression-secret",
        collections: [{
          ...Media,
          access: { ...Media.access, create: () => true },
        }],
        db: createPayloadPostgresAdapter({
          pool: { connectionString, idleTimeoutMillis: 25 },
          push: true,
        }),
        plugins: [gcsStorage({
          bucket: "synthetic-upload-test",
          options: {},
          collections: { media: { prefix: "local/cms" } },
          useCompositePrefixes: true,
        })],
        sharp,
      }),
    });
    const adapter = payload.db as CmsPostgresAdapter;
    poolConstructor = Object.getPrototypeOf(adapter.pool).constructor;
    constructorName = Object.getOwnPropertyDescriptor(poolConstructor, "name");
    // Reproduce the loss of constructor names in the production bundle.
    Object.defineProperty(poolConstructor, "name", { configurable: true, value: "" });
    image = await sharp({
      create: { width: 40, height: 30, channels: 3, background: "white" },
    }).png().toBuffer();
  }, 60_000);

  afterAll(async () => {
    if (constructorName) {
      Object.defineProperty(poolConstructor, "name", constructorName);
    }
    await payload?.destroy();
    vi.restoreAllMocks();
  });

  it("uses the canonical driver despite production class-name removal", () => {
    const adapter = payload.db as CmsPostgresAdapter;
    expect(adapter.pool).toBeInstanceOf(pg.Pool);
  });

  it("keeps the media transaction alive through a slow multipart upload", async () => {
    const body = new FormData();
    body.set("_payload", JSON.stringify({ alt: "Slow REST upload" }));
    body.set(
      "file",
      new Blob([new Uint8Array(image)], { type: "image/png" }),
      "slow-image.png",
    );
    const response = await handleEndpoints({
      config: payload.config,
      request: new Request("http://localhost:3008/api/media?depth=0", {
        method: "POST",
        body,
      }),
    });
    const result = await response.json();
    expect(result).toMatchObject({ doc: { alt: "Slow REST upload" } });
    expect(response.status).toBe(201);
    expect(save).toHaveBeenCalledTimes(5);
    expect(await payload.findByID({ collection: "media", id: result.doc.id }))
      .toMatchObject({ filename: "slow-image.png", mimeType: "image/png" });
  });
});
