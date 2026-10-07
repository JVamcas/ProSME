import "server-only";

import path from "node:path";
import type { CollectionConfig, Plugin } from "payload";
import type { Media } from "@/payload-types";

import { CmsMediaDeliveryCache, type CachedCmsImage } from "./CmsMediaDeliveryCache";
import { isCmsMediaPrefix } from "./CmsMediaStorage";

type UploadConfig = Exclude<CollectionConfig["upload"], boolean | undefined>;
type FileHandler = NonNullable<UploadConfig["handlers"]>[number];

const publicCacheControl = "public, max-age=14400, must-revalidate";

function cachedResponse(
  image: CachedCmsImage,
  requestHeaders: Headers,
  hit: boolean,
  incomingHeaders?: Headers,
  method = "GET",
) {
  const headers = new Headers(incomingHeaders);
  for (const [name, value] of image.headers) {
    headers.set(name, value);
  }
  headers.set("Cache-Control", publicCacheControl);
  headers.set("X-Cms-Media-Cache", hit ? "HIT" : "MISS");
  const etag = requestHeaders.get("if-none-match") ?? requestHeaders.get("etag");
  if (etag && etag === headers.get("etag")) {
    headers.delete("Content-Length");
    return new Response(null, { status: 304, headers });
  }
  return new Response(method === "HEAD" ? null : new Uint8Array(image.body), { headers });
}

export function cacheCmsMediaHandler(
  handler: FileHandler,
  cache: CmsMediaDeliveryCache,
  namespace: string,
): FileHandler {
  const pending = new Map<string, Promise<CachedCmsImage | undefined>>();

  const cachedHandler = async (
    req: Parameters<FileHandler>[0],
    args: Parameters<FileHandler>[1],
  ) => {
    const doc = args.doc as Media | undefined;
    const { filename, prefix } = args.params;
    const variant = Object.values(doc?.sizes ?? {})
      .find((size) => size?.filename === filename);
    // Payload calls handlers only AFTER checkFileAccess. Require its current
    // document and matching UUID prefix, so removed/replaced files cannot hit.
    if (
      !doc ||
      !isCmsMediaPrefix(prefix) ||
      doc.prefix !== prefix ||
      variant?.mimeType !== "image/webp" ||
      req.headers.has("range") ||
      (req.method !== "GET" && req.method !== "HEAD")
    ) {
      return handler(req, args);
    }

    const key = JSON.stringify([namespace, prefix, filename, doc.updatedAt]);
    const saved = await cache.read(key);
    if (saved) {
      return cachedResponse(saved, req.headers, true, args.headers, req.method);
    }
    const inFlight = pending.get(key);
    if (inFlight) {
      const image = await inFlight;
      if (image) {
        return cachedResponse(image, req.headers, true, args.headers, req.method);
      }
    }

    // Delegate partial/conditional/error responses unchanged; only full,
    // bounded generated WebP responses populate the persistent cache.
    let finish: (image: CachedCmsImage | undefined) => void = () => undefined;
    const work = new Promise<CachedCmsImage | undefined>((resolve) => {
      finish = resolve;
    });
    pending.set(key, work);
    try {
      const response = await handler(req, args);
      const length = Number(response?.headers.get("content-length"));
      if (
        !response ||
        response.status !== 200 ||
        !response.body ||
        response.headers.get("content-type") !== "image/webp" ||
        response.headers.has("set-cookie") ||
        !Number.isInteger(length) ||
        length <= 0 ||
        length > 2 * 1024 * 1024
      ) {
        return response;
      }
      const image: CachedCmsImage = {
        body: Buffer.from(await response.arrayBuffer()),
        // Request-specific CORS headers come from the current handler arguments.
        headers: [...response.headers.entries()].filter(([name]) =>
          ["content-type", "content-length", "etag", "accept-ranges"].includes(name),
        ),
      };
      try {
        await cache.write(key, image);
      } catch (error) {
        req.payload.logger.warn({ err: error }, "CMS image cache write failed");
      }
      finish(image);
      return cachedResponse(image, req.headers, false, args.headers, req.method);
    } finally {
      finish(undefined);
      if (pending.get(key) === work) {
        pending.delete(key);
      }
    }
  };
  // Payload awaits handlers and accepts Response or void. Its declaration
  // omits Promise<Response | void>, although the runtime supports that union.
  return cachedHandler as FileHandler;
}

/** Must follow the GCS plugin; keeps its authenticated storage adapter intact. */
export function cmsMediaDeliveryPlugin(namespace: string): Plugin {
  const cache = new CmsMediaDeliveryCache(path.resolve(".next/cache/cms-media"));
  return (config) => ({
    ...config,
    collections: config.collections?.map((collection) => {
      if (collection.slug !== "media" || typeof collection.upload !== "object") {
        return collection;
      }
      return {
        ...collection,
        upload: {
          ...collection.upload,
          handlers: collection.upload.handlers?.map((handler) =>
            cacheCmsMediaHandler(handler, cache, namespace),
          ),
        },
      };
    }),
  });
}
