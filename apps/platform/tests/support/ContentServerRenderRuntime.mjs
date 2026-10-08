import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToReadableStream } from "next/dist/compiled/react-server-dom-webpack/server.node.js";

globalThis.AsyncLocalStorage = AsyncLocalStorage;

const runtimeRequire = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));

// Run under --conditions=react-server to exercise the installed React cache
// with its real RSC request dispatcher. Only CMS transport and identity are fixtures.
const sourceRoot = path.resolve(directory, "../../src");
const requests = new AsyncLocalStorage();
const modules = new Map();
const calls = [];
const { IncrementalCache } = runtimeRequire("next/dist/server/lib/incremental-cache/index.js");
const { workUnitAsyncStorage } = runtimeRequire("next/dist/server/app-render/work-unit-async-storage.external.js");
const { workAsyncStorage } = runtimeRequire("next/dist/server/app-render/work-async-storage.external.js");
const cacheDirectory = await fs.mkdtemp(path.join(tmpdir(), "cms-published-cache-"));
const incrementalCache = new IncrementalCache({
  fs: { ...fs, mkdir: (directory) => fs.mkdir(directory, { recursive: true }) },
  dev: false,
  flushToDisk: true,
  minimalMode: false,
  serverDistDir: path.join(cacheDirectory, "server"),
  requestHeaders: {},
  maxMemoryCacheSize: 0,
  getPrerenderManifest: () => ({
    version: 4,
    routes: {},
    dynamicRoutes: {},
    notFoundRoutes: [],
    preview: { previewModeId: "fixture" },
  }),
});
globalThis.__incrementalCache = incrementalCache;
const state = {
  publishedTitle: "Published",
  draftTitle: "Pending",
  published: true,
  publishedSlug: "about",
  resourceTotal: 25,
};

function matches(document, where = {}) {
  if (where.and) return where.and.every((part) => matches(document, part));
  return Object.entries(where).every(([key, condition]) => {
    if ("equals" in condition) return document[key] === condition.equals;
    if ("exists" in condition) return Boolean(document[key]) === condition.exists;
    return true;
  });
}

const payload = {
  async find(query) {
    calls.push(query);
    const document = {
      id: 1,
      slug: state.publishedSlug,
      title: query.draft ? state.draftTitle : state.publishedTitle,
      summary: "Summary",
      excerpt: "Excerpt",
      description: "Description",
      question: "Question",
      answer: {},
      value: "10",
      label: "Businesses",
      _status: query.draft || !state.published ? "draft" : "published",
      publishedAt: "2026-10-08T00:00:00.000Z",
      createdAt: "2026-10-01T00:00:00.000Z",
    };
    if (query.collection === "resources" && query.pagination) {
      return {
        docs: query.page <= Math.ceil(state.resourceTotal / query.limit) ? [document] : [],
        totalDocs: state.resourceTotal,
        totalPages: Math.ceil(state.resourceTotal / query.limit),
        hasNextPage: query.page < Math.ceil(state.resourceTotal / query.limit),
      };
    }
    return { docs: matches(document, query.where) ? [document] : [] };
  },
  async findGlobal(query) {
    calls.push(query);
    return {
      _status: query.draft || !state.published ? "draft" : "published",
      title: query.draft ? state.draftTitle : state.publishedTitle,
      siteName: query.draft ? state.draftTitle : state.publishedTitle,
      siteDescription: "Description",
      email: "contact@example.test",
    };
  },
};

function loadSource(filename) {
  if (!path.extname(filename)) {
    filename = existsSync(`${filename}.ts`)
      ? `${filename}.ts`
      : path.join(filename, "index.ts");
  }
  if (modules.has(filename)) return modules.get(filename).exports;
  const loadedModule = { exports: {} };
  modules.set(filename, loadedModule);
  const result = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  function sourceRequire(name) {
    if (name === "server-only") return {};
    if (name === "@payload-config") return { default: {} };
    if (name === "payload") return { getPayload: async () => payload };
    if (name === "next/headers") {
      return {
        draftMode: async () => ({
          isEnabled: requests.getStore()?.preview ?? false,
        }),
      };
    }
    if (name === "@/auth/authorization/current-user") {
      return { getCurrentUser: async () => requests.getStore()?.user ?? null };
    }
    if (name.startsWith("@/")) return loadSource(path.join(sourceRoot, name.slice(2)));
    if (name.startsWith(".")) return loadSource(path.resolve(path.dirname(filename), name));
    return runtimeRequire(name);
  }
  vm.runInThisContext(`(function(require, module, exports) {\n${result.outputText}\n})`, {
    filename,
  })(sourceRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const content = loadSource(
  path.join(sourceRoot, "modules/content/ServerContentQueries.ts"),
);
const resources = loadSource(
  path.join(sourceRoot, "modules/content/ServerResourceCentreService.ts"),
);

async function render(
  read,
  preview = false,
  capabilities = [],
  status = "active",
  prerender = false,
) {
  let value;
  const errors = [];
  const user = { status, capabilities: new Set(capabilities) };
  const store = {
    incrementalCache,
    route: "/fixture",
    page: "/fixture/page",
    isDraftMode: preview,
    isStaticGeneration: prerender,
  };
  const unit = prerender
    ? {
        type: "prerender-legacy",
        phase: "render",
        revalidate: 300,
      }
    : {
        type: "request",
        phase: "render",
        url: { pathname: "/fixture", search: "" },
        draftMode: { isEnabled: preview },
        asyncApiPromises: { connection: Promise.resolve() },
      };
  await requests.run({ preview, user }, () =>
    workAsyncStorage.run(store, () =>
      workUnitAsyncStorage.run(unit, async () => {
        async function Page() {
          value = await read();
          return null;
        }
        const stream = renderToReadableStream(
          React.createElement(Page),
          {},
          {
            onError: (error) => {
              errors.push(error);
            },
          },
        );
        await new Response(stream).text();
        await Promise.all(Object.values(store.pendingRevalidates ?? {}));
      }),
    ),
  );
  if (errors.length) throw errors[0];
  return value;
}

const hooks = loadSource(path.join(sourceRoot, "payload/hooks/revalidate-public-content.ts"));

async function invalidate(source = "pages", slug = "about", previousSlug) {
  const store = { incrementalCache, route: "/api/cms", page: "/api/cms/route" };
  workAsyncStorage.run(store, () => {
    if (["homepage", "header", "footer", "contact-details", "site-settings"].includes(source)) {
      hooks.revalidateGlobal({ global: { slug: source }, doc: {}, req: { context: {} } });
    } else {
      hooks.revalidateCollection({
        collection: { slug: source },
        doc: { slug },
        previousDoc: { slug: previousSlug },
        req: { context: {} },
      });
    }
  });
  assert(store.pendingRevalidatedTags?.some((entry) => entry.tag === `cms-published:${source}`));
  for (const entry of store.pendingRevalidatedTags) {
    await incrementalCache.revalidateTag(entry.tag, entry.profile);
  }
  // Keep synthetic consecutive events apart from filesystem timestamp rounding.
  await new Promise((resolve) => setTimeout(resolve, 5));
}

export { calls, content, resources, render, invalidate, state };

export async function readAfterCacheRestart(slug) {
  // Simulate a new module instance and lost process-local tags with old cache
  // files still on disk. A new namespace must miss those files.
  const { tagsManifest } = runtimeRequire(
    "next/dist/server/lib/incremental-cache/tags-manifest.external.js",
  );
  tagsManifest.clear();
  for (const filename of ["PublishedContentCache.ts", "PublishedContentRepository.ts"]) {
    modules.delete(path.join(sourceRoot, "modules/content/infrastructure", filename));
  }
  const restarted = loadSource(
    path.join(sourceRoot, "modules/content/infrastructure/PublishedContentRepository.ts"),
  );
  return restarted.readPublishedPage(slug);
}

export async function cleanup() {
  await fs.rm(cacheDirectory, { recursive: true, force: true });
}
