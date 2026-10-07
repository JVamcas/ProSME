import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Config, PayloadRequest } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CmsMediaDeliveryCache } from "@/modules/content/infrastructure/CmsMediaDeliveryCache";
import {
  cacheCmsMediaHandler,
  cmsMediaDeliveryPlugin,
} from "@/modules/content/infrastructure/CmsMediaDeliveryPlugin";
import { cmsMediaAccess } from "@/payload/access/cms-resource-access";

const prefix = "media/b20395c3-d076-4f44-84a3-bf3c62da071d";
const body = Buffer.from("already generated WebP bytes");
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "cms-media-cache-test-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function sourceResponse() {
  return new Response(body, {
    headers: {
      "content-type": "image/webp",
      "content-length": String(body.length),
      etag: "stored-object-etag",
    },
  });
}

function request(headers: HeadersInit = {}, method = "GET") {
  return {
    headers: new Headers(headers),
    method,
    payload: { logger: { warn: vi.fn() } },
  } as unknown as PayloadRequest;
}

function argumentsForFile() {
  return {
    doc: {
      id: 165,
      prefix,
      updatedAt: "2026-10-07T20:00:00Z",
      sizes: { mobile: { filename: "hero-mobile.webp", mimeType: "image/webp" } },
    },
    headers: new Headers({ "access-control-allow-origin": "https://current.test" }),
    params: { collection: "media", filename: "hero-mobile.webp", prefix },
  };
}

async function responseFrom(
  handler: ReturnType<typeof cacheCmsMediaHandler>,
  req = request(),
  args = argumentsForFile(),
) {
  const response = await handler(req, args);
  if (!(response instanceof Response)) {
    throw new Error("Expected media response");
  }
  return response;
}

describe("persistent CMS image delivery", () => {
  it("serves identical bytes after replacing the handler and cache instance", async () => {
    const source = vi.fn().mockImplementation(sourceResponse);
    const initial = cacheCmsMediaHandler(source, new CmsMediaDeliveryCache(directory), "local/cms");
    const cold = await responseFrom(initial);
    expect(cold.headers.get("x-cms-media-cache")).toBe("MISS");
    expect(cold.headers.get("cache-control")).toBe("public, max-age=14400, must-revalidate");
    expect(Buffer.from(await cold.arrayBuffer())).toEqual(body);

    const restarted = cacheCmsMediaHandler(source, new CmsMediaDeliveryCache(directory), "local/cms");
    const warm = await responseFrom(restarted);
    expect(warm.headers.get("x-cms-media-cache")).toBe("HIT");
    expect(warm.headers.get("access-control-allow-origin")).toBe("https://current.test");
    expect(Buffer.from(await warm.arrayBuffer())).toEqual(body);
    expect(source).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent misses without sharing consumable response bodies", async () => {
    let complete: (response: Response) => void = () => undefined;
    const source = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      complete = resolve;
    }));
    const handler = cacheCmsMediaHandler(source, new CmsMediaDeliveryCache(directory), "local/cms");
    const first = responseFrom(handler);
    await vi.waitFor(() => expect(source).toHaveBeenCalledTimes(1));
    const second = responseFrom(handler);
    complete(sourceResponse());
    const responses = await Promise.all([first, second]);
    const bytes = await Promise.all(responses.map((response) => response.arrayBuffer()));
    expect(bytes.map((value) => Buffer.from(value))).toEqual([body, body]);
    expect(source).toHaveBeenCalledTimes(1);
  });

  it("separates storage environments and document revisions", async () => {
    const source = vi.fn().mockImplementation(sourceResponse);
    const cache = new CmsMediaDeliveryCache(directory);
    const local = cacheCmsMediaHandler(source, cache, "bucket:local/cms");
    await responseFrom(local);
    await responseFrom(cacheCmsMediaHandler(source, cache, "bucket:dev/cms"));
    const changed = argumentsForFile();
    changed.doc.updatedAt = "2026-10-07T21:00:00Z";
    await responseFrom(local, request(), changed);
    expect(source).toHaveBeenCalledTimes(3);
  });

  it("does not use cached bytes without the current document and exact prefix", async () => {
    const source = vi.fn().mockImplementation(sourceResponse);
    const handler = cacheCmsMediaHandler(source, new CmsMediaDeliveryCache(directory), "local/cms");
    await responseFrom(handler);
    source.mockImplementation(() => new Response(null, { status: 404 }));
    const absent = { ...argumentsForFile(), doc: undefined };
    expect((await handler(request(), absent as unknown as Parameters<typeof handler>[1]))?.status).toBe(404);
    const mismatch = argumentsForFile();
    mismatch.params.prefix = "media/98df6c1d-f51e-4717-9917-d316b23ec4b6";
    expect((await responseFrom(handler, request(), mismatch)).status).toBe(404);
    expect(source).toHaveBeenCalledTimes(3);
  });

  it("delegates ranges and rejects caching originals, non-WebP files and errors", async () => {
    const source = vi.fn().mockImplementation(sourceResponse);
    const handler = cacheCmsMediaHandler(source, new CmsMediaDeliveryCache(directory), "local/cms");
    await responseFrom(handler);
    source.mockImplementation(() => new Response("partial", { status: 206 }));
    expect((await responseFrom(handler, request({ range: "bytes=0-3" }))).status).toBe(206);
    const original = argumentsForFile();
    original.params.filename = "original.png";
    expect((await responseFrom(handler, request(), original)).status).toBe(206);
    const png = argumentsForFile();
    png.doc.sizes.mobile.mimeType = "image/png";
    expect((await responseFrom(handler, request(), png)).status).toBe(206);
    const failed = argumentsForFile();
    failed.doc.updatedAt = "2026-10-07T22:00:00Z";
    source.mockImplementation(() => new Response(null, { status: 500 }));
    expect((await responseFrom(handler, request(), failed)).status).toBe(500);
    expect((await responseFrom(handler, request(), failed)).status).toBe(500);
    expect(source).toHaveBeenCalledTimes(6);
  });

  it("handles conditional and HEAD hits without going back to storage", async () => {
    const source = vi.fn().mockImplementation(sourceResponse);
    const handler = cacheCmsMediaHandler(source, new CmsMediaDeliveryCache(directory), "local/cms");
    await responseFrom(handler);
    const conditional = await responseFrom(handler, request({ "if-none-match": "stored-object-etag" }));
    expect(conditional.status).toBe(304);
    expect(conditional.body).toBeNull();
    const head = await responseFrom(handler, request({}, "HEAD"));
    expect(head.status).toBe(200);
    expect(head.body).toBeNull();
    expect(head.headers.get("content-length")).toBe(String(body.length));
    expect(source).toHaveBeenCalledTimes(1);
  });

  it("falls back to storage for corrupt entries and cache write failures", async () => {
    const source = vi.fn().mockImplementation(sourceResponse);
    const cache = new CmsMediaDeliveryCache(directory);
    const handler = cacheCmsMediaHandler(source, cache, "local/cms");
    await responseFrom(handler);
    const [filename] = await readdir(directory);
    await writeFile(path.join(directory, filename), "broken");
    expect(Buffer.from(await (await responseFrom(handler)).arrayBuffer())).toEqual(body);
    const changed = argumentsForFile();
    changed.doc.updatedAt = "new revision";
    vi.spyOn(cache, "write").mockRejectedValue(new Error("disk full"));
    expect(Buffer.from(await (await responseFrom(handler, request(), changed)).arrayBuffer())).toEqual(body);
  });

  it("keeps access policy and other collections unchanged when wrapping storage handlers", async () => {
    const access = cmsMediaAccess();
    const protectedRead = vi.fn().mockReturnValue(false);
    const source = vi.fn().mockImplementation(sourceResponse);
    const other = { slug: "private-documents", fields: [], access: { read: protectedRead } };
    const config = await cmsMediaDeliveryPlugin("local/cms")({
      db: vi.fn() as unknown as Config["db"],
      secret: "cache-test-secret",
      collections: [{ slug: "media", fields: [], access, upload: { handlers: [source] } }, other],
    });
    expect(config.collections?.[0].access).toBe(access);
    expect(config.collections?.[1]).toBe(other);
    expect(source).not.toHaveBeenCalled();
  });

  it("caps cache entry size and evicts the oldest entries above its count budget", async () => {
    const cache = new CmsMediaDeliveryCache(directory);
    await cache.write("too-large", { body: Buffer.alloc(2 * 1024 * 1024 + 1), headers: [] });
    expect(await cache.read("too-large")).toBeUndefined();
    const entries = Array.from({ length: 513 }, (_, index) =>
      writeFile(path.join(directory, `${index.toString(16).padStart(64, "0")}.image`), "old"),
    );
    await Promise.all(entries);
    await cache.write("new", { body, headers: [] });
    expect((await readdir(directory)).length).toBe(512);
    expect(await cache.read("new")).toBeDefined();
  });
});
