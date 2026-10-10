import assert from "node:assert/strict";
import {
  calls,
  content,
  resources,
  render,
  invalidate,
  state,
  cleanup,
  readAfterCacheRestart,
} from "./ContentServerRenderRuntime.mjs";

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
    assert.equal((await content.getListingItem("news", "about")).title, state.publishedTitle);
  });
  // Five globals, six collection reads, four bounded feed reads, resource detail,
  // and a distinct page slug. The three calls per identical getter run only once.
  assert.equal(calls.length, 17);
  assert.equal(calls.filter((query) => query.slug === "site-settings").length, 1);
  assert.equal(calls.filter((query) => query.collection === "programme-statistics").length, 1);
  return { readsWithMemoization: calls.length };
}

async function verifyPublication() {
  state.published = false;
  await invalidate("pages");
  await invalidate("homepage");
  await invalidate("resources");
  await invalidate("news");
  assert.equal(await render(() => content.getPage("about")), null);
  assert.equal(await render(() => content.getHomepage()), null);
  state.published = true;
  await invalidate("pages");
  await invalidate("homepage");
  assert.equal((await render(() => content.getPage("about"))).title, "Published");
  state.publishedTitle = "Republished";
  await invalidate("pages");
  assert.equal((await render(() => content.getPage("about"))).title, "Republished");
  state.published = false;
  await invalidate("pages");
  await invalidate("homepage");
  await invalidate("resources");
  await invalidate("news");
  assert.equal(await render(() => content.getPage("about")), null);
  assert.equal(await render(() => content.getHomepage()), null);
  assert.equal(await render(() => resources.getResource("about")), null);
  assert.deepEqual(await render(() => content.getNews()), []);
  assert.deepEqual(await render(() => content.getHomeNewsAndResources()), []);
  const homePreview = await render(
    () => content.getHomepage(),
    true,
    ["cms.site-settings.read"],
  );
  assert.equal(homePreview.title, "Pending");
  assert.equal(await render(() => content.getHomepage()), null);
  state.published = true;
  await invalidate("pages");
  await invalidate("homepage");
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
      assert(calls.every((query) => query.draft === false));
    }
  }
  // Home feed intentionally remains published-only even during Home preview.
  calls.length = 0;
  await render(() => content.getHomeNewsAndResources(), true, [
    "cms.news.read",
    "cms.resources.read",
  ]);
  assert(calls.length === 0 || calls.length === 4);
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
    await assert.rejects(
      render(
        () => Promise.all([
          content.getHomepage(),
          content.getSiteSettings(),
          content.getPage("about"),
          content.getHomeNewsAndResources(),
          resources.getResource("about"),
          resources.getResourcePage("2"),
        ]),
        false,
        [],
        "active",
        true,
      ),
      /couldn.t be rendered statically/,
    );
    assert.equal(calls.length, 0);
    // Even a leaked build env flag must not return placeholders at runtime.
    assert.equal((await render(() => content.getPage("about"))).title, "Republished");
  } finally {
    delete process.env.SKIP_CMS_PRERENDER;
  }
  return true;
}

async function verifyPersistentCache() {
  await invalidate("pages");
  calls.length = 0;
  assert.equal((await render(() => content.getPage("about"))).title, "Republished");
  const coldReads = calls.length;
  assert.equal(coldReads, 1);
  assert.equal((await render(() => content.getPage("about"))).title, "Republished");
  assert.equal(calls.length, coldReads, "A new request must reuse published data");
  state.publishedTitle = "New publication";
  assert.equal((await render(() => content.getPage("about"))).title, "Republished");
  await invalidate("pages");
  assert.equal((await render(() => content.getPage("about"))).title, "New publication");
  assert.equal(calls.length, coldReads + 1);
  await invalidate("media");
  await render(() => content.getPage("about"));
  assert.equal(calls.length, coldReads + 2, "Media changes invalidate populated page relationships");
  assert.equal(await render(() => content.getPage("renamed")), null);
  state.publishedSlug = "renamed";
  await invalidate("pages", "renamed", "about");
  assert.equal(await render(() => content.getPage("about")), null);
  assert.equal((await render(() => content.getPage("renamed"))).title, "New publication");
  return true;
}

async function verifyResourcePagination() {
  await invalidate("resources");
  calls.length = 0;
  const first = await render(() => resources.getResourcePage("1"));
  assert.equal(first.totalPages, 3);
  assert.equal(first.total, 25);
  assert.equal((await render(() => resources.getResourcePage("1"))).total, 25);
  assert.equal(calls.length, 1);
  const second = await render(() => resources.getResourcePage("2"));
  assert.equal(second.page, 2);
  assert.equal(calls.length, 2);
  state.resourceTotal = 13;
  await invalidate("resources");
  const updated = await Promise.all([
    render(() => resources.getResourcePage("1")),
    render(() => resources.getResourcePage("2")),
    render(() => resources.getResourcePage("3")),
  ]);
  assert(updated.every((page) => page.total === 13 && page.totalPages === 2));
  assert.equal(updated[0].hasNextPage, true);
  assert.equal(updated[1].hasNextPage, false);
  assert.deepEqual(updated[2].items, []);
  return true;
}

async function verifyRestartIsolation() {
  assert.equal((await render(() => content.getPage("renamed"))).title, "New publication");
  state.published = false;
  await invalidate("pages", "renamed");
  calls.length = 0;
  const result = await readAfterCacheRestart("renamed");
  assert.deepEqual(result.docs, []);
  assert.equal(calls.length, 1, "Restart must read current publication state");
  return true;
}

(async () => {
  const report = {
    deduplication: await verifyDeduplication(),
    publication: await verifyPublication(),
    preview: await verifyPreview(),
    buildFallback: await verifyBuildFallback(),
    persistentCache: await verifyPersistentCache(),
    resourcePagination: await verifyResourcePagination(),
    restartIsolation: await verifyRestartIsolation(),
  };
  await cleanup();
  process.stdout.write(JSON.stringify(report));
})().catch(async (error) => {
  await cleanup();
  console.error(error);
  process.exitCode = 1;
});
