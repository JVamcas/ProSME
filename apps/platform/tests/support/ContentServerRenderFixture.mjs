import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToReadableStream } from "next/dist/compiled/react-server-dom-webpack/server.node.js";

const runtimeRequire = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));

// Run under --conditions=react-server to exercise the installed React cache
// with its real RSC request dispatcher. Only CMS transport and identity are fixtures.
const sourceRoot = path.resolve(directory, "../../src");
const requests = new AsyncLocalStorage();
const modules = new Map();
const calls = [];
let publishedTitle = "Published";
let draftTitle = "Pending";
let published = true;

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
      slug: "about",
      title: query.draft ? draftTitle : publishedTitle,
      summary: "Summary",
      excerpt: "Excerpt",
      description: "Description",
      question: "Question",
      answer: {},
      value: "10",
      label: "Businesses",
      _status: query.draft || !published ? "draft" : "published",
      publishedAt: "2026-10-08T00:00:00.000Z",
      createdAt: "2026-10-01T00:00:00.000Z",
    };
    return { docs: matches(document, query.where) ? [document] : [] };
  },
  async findGlobal(query) {
    calls.push(query);
    return {
      _status: query.draft || !published ? "draft" : "published",
      title: query.draft ? draftTitle : publishedTitle,
      siteName: query.draft ? draftTitle : publishedTitle,
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

async function render(read, preview = false, capabilities = [], status = "active") {
  let value;
  const errors = [];
  const user = { status, capabilities: new Set(capabilities) };
  await requests.run({ preview, user }, async () => {
    async function Page() {
      value = await read();
      return null;
    }
    const stream = renderToReadableStream(
      React.createElement(Page),
      {},
      { onError: (error) => errors.push(error) },
    );
    await new Response(stream).text();
  });
  if (errors.length) throw errors[0];
  return value;
}

async function verifyDeduplication() {
  const reads = [
    () => content.getHomepage(),
    () => content.getHeader(),
    () => content.getFooter(),
    () => content.getContactDetails(),
    () => content.getSiteSettings(),
    () => content.getPage("about"),
    () => content.getNews(),
    () => content.getEvents(),
    () => content.getFaqs(),
    () => content.getStatistics(),
    () => content.getEligibilityContent(),
    () => content.getHomeNewsAndResources(),
    () => resources.getResource("about"),
  ];
  calls.length = 0;
  await render(async () => {
    await Promise.all(
      reads.map(async (read) => {
        const pending = read();
        assert.strictEqual(read(), pending, "Concurrent readers must share the promise");
        const value = await pending;
        assert.strictEqual(await read(), value, "Later readers must reuse the projection");
      }),
    );
    assert.equal(await content.getPage("different"), null);
    assert.equal((await content.getListingItem("news", "about")).title, publishedTitle);
  });
  // Five globals, six collection reads, four bounded feed reads, resource detail,
  // and a distinct page slug. The three calls per identical getter run only once.
  assert.equal(calls.length, 17);
  assert.equal(calls.filter((query) => query.slug === "site-settings").length, 1);
  assert.equal(calls.filter((query) => query.collection === "programme-statistics").length, 1);
  return { readsWithMemoization: calls.length };
}

async function verifyPublication() {
  published = false;
  assert.equal(await render(() => content.getPage("about")), null);
  assert.equal(await render(() => content.getHomepage()), null);
  published = true;
  assert.equal((await render(() => content.getPage("about"))).title, "Published");
  publishedTitle = "Republished";
  assert.equal((await render(() => content.getPage("about"))).title, "Republished");
  published = false;
  assert.equal(await render(() => content.getPage("about")), null);
  assert.equal(await render(() => content.getHomepage()), null);
  assert.equal(await render(() => resources.getResource("about")), null);
  assert.deepEqual(await render(() => content.getNews()), []);
  assert.deepEqual(await render(() => content.getHomeNewsAndResources()), { news: [], resources: [] });
  const homePreview = await render(
    () => content.getHomepage(),
    true,
    ["cms.site-settings.read"],
  );
  assert.equal(homePreview.title, "Pending");
  assert.equal(await render(() => content.getHomepage()), null);
  published = true;
  assert.equal((await render(() => content.getHomepage())).title, "Republished");
  return true;
}

async function verifyPreview() {
  const getters = [
    ["pages", () => content.getPage("about")],
    ["news", () => content.getNews()],
    ["events", () => content.getEvents()],
    ["faqs", () => content.getFaqs()],
    ["statistics", () => content.getStatistics()],
    ["eligibility", () => content.getEligibilityContent()],
    ["resources", () => resources.getResource("about")],
    ["site-settings", () => content.getHomepage()],
  ];
  for (const [resource, read] of getters) {
    calls.length = 0;
    await render(read, true, [`cms.${resource}.read`]);
    assert.equal(calls[0].draft, true);
    const deniedSessions = [
      [[], "active"],
      [[`cms.${resource}.read`], "disabled"],
    ];
    for (const [grants, status] of deniedSessions) {
      calls.length = 0;
      await render(read, true, grants, status);
      assert.equal(calls[0].draft, false);
    }
  }
  // Home feed intentionally remains published-only even during Home preview.
  calls.length = 0;
  await render(() => content.getHomeNewsAndResources(), true, [
    "cms.news.read",
    "cms.resources.read",
  ]);
  assert.equal(calls.length, 4);
  assert(calls.every((query) => query.draft === false));
  const [preview, publicPage] = await Promise.all([
    render(() => content.getPage("about"), true, ["cms.pages.read"]),
    render(() => content.getPage("about")),
  ]);
  assert.equal(preview.title, "Pending");
  assert.equal(publicPage.title, "Republished");
  const mismatchedPreview = await render(
    () => content.getPage("about"),
    true,
    ["cms.news.read"],
  );
  assert.equal(mismatchedPreview.title, "Republished");
  assert.equal((await render(() => content.getPage("about"))).title, "Republished");
  return true;
}

async function verifyBuildFallback() {
  calls.length = 0;
  process.env.SKIP_CMS_PRERENDER = "1";
  try {
    await render(() => Promise.all([
      content.getHomepage(),
      content.getSiteSettings(),
      content.getPage("about"),
    ]));
    assert.equal(calls.length, 0);
  } finally {
    delete process.env.SKIP_CMS_PRERENDER;
  }
  assert.equal((await render(() => content.getPage("about"))).title, "Republished");
  return true;
}

(async () => {
  const report = {
    deduplication: await verifyDeduplication(),
    publication: await verifyPublication(),
    preview: await verifyPreview(),
    buildFallback: await verifyBuildFallback(),
  };
  process.stdout.write(JSON.stringify(report));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
