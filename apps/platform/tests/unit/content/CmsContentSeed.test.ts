import type { Payload, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { seedFaqs, seedPages } from "@/payload/seed/seed-editorial";
import { seedProgrammeContent } from "@/payload/seed/seed-programme";
import { seedResources } from "@/payload/seed/seed-resources";
import { seedSiteGlobals } from "@/payload/seed/seed-site-globals";

type Document = Record<string, unknown> & { id: number };
type FindInput = {
  collection: string;
  select: Record<string, boolean>;
  where?: Record<string, { equals: unknown }>;
};
type CreateInput = { collection: string; data: Record<string, unknown> };
type GlobalInput = { slug: string; data: Record<string, unknown> };

function seedStore() {
  const records = new Map<string, Document[]>();
  const globals = new Map<string, Record<string, unknown>>();
  let nextId = 1;
  const timestamp = "2026-10-07T10:00:00.000Z";
  const client = {
    find: vi.fn(async ({ collection, where }: FindInput) => {
      const rows = records.get(collection) ?? [];
      const matches = rows.filter((row) =>
        Object.entries(where ?? {}).every(([field, condition]) =>
          row[field] === condition.equals,
        ),
      );
      return { docs: matches.slice(0, 1) };
    }),
    findGlobal: vi.fn(async ({ slug }: { slug: string }) => globals.get(slug) ?? {}),
    create: vi.fn(async ({ collection, data }: CreateInput) => {
      const row = { id: nextId++, ...structuredClone(data) };
      records.set(collection, [...(records.get(collection) ?? []), row]);
      if (collection !== "media") {
        records.set("content-audit-entries", [
          ...(records.get("content-audit-entries") ?? []),
          { id: nextId++, collection },
        ]);
      }
      return row;
    }),
    update: vi.fn(),
    updateGlobal: vi.fn(async ({ slug, data }: GlobalInput) => {
      const row = { ...structuredClone(data), createdAt: timestamp, updatedAt: timestamp };
      globals.set(slug, row);
      return row;
    }),
  };
  const payload = client as unknown as Payload;
  const req = { transactionID: "seed-transaction" } as PayloadRequest;

  async function initialize() {
    await seedSiteGlobals(payload, req);
    await Promise.all([
      seedPages(payload, req),
      seedFaqs(payload, req),
      seedProgrammeContent(payload, req),
      seedResources(payload, req),
    ]);
  }

  function clearWrites() {
    client.create.mockClear();
    client.update.mockClear();
    client.updateGlobal.mockClear();
  }

  function expectNoWrites() {
    expect(client.create).not.toHaveBeenCalled();
    expect(client.update).not.toHaveBeenCalled();
    expect(client.updateGlobal).not.toHaveBeenCalled();
  }

  return { records, globals, client, payload, req, initialize, clearWrites, expectNoWrites };
}

describe("CMS baseline initialization", () => {
  it("initializes an empty installation with the existing published defaults", async () => {
    const store = seedStore();
    await store.initialize();

    expect(store.globals.size).toBe(5);
    for (const collection of ["pages", "faqs", "resources", "programme-statistics", "eligibility-content"]) {
      expect(store.records.get(collection)?.length).toBeGreaterThan(0);
      expect(store.records.get(collection)?.every((doc) => doc._status === "published")).toBe(true);
    }
    expect(store.records.get("eligibility-content")).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "criterion" }),
      expect.objectContaining({ kind: "focusSector" }),
    ]));
    for (const [options] of store.client.find.mock.calls) {
      expect(options).toMatchObject({ req: store.req, limit: 1, depth: 0, select: {} });
      expect(options.select).toEqual({});
    }
    for (const [options] of store.client.create.mock.calls) {
      expect(options).toMatchObject({ req: store.req });
    }
    for (const [options] of store.client.updateGlobal.mock.calls) {
      expect(options).toMatchObject({ req: store.req });
    }
  });

  it("reruns without overwriting edits, layouts, drafts, renamed entries or reordered statistics", async () => {
    const store = seedStore();
    await store.initialize();
    for (const global of store.globals.values()) {
      Object.assign(global, {
        title: "Editorial heading",
        _status: "draft",
        layout: [{ blockType: "statistics", items: [{ value: "42", label: "Custom" }] }],
      });
    }
    for (const [collection, rows] of store.records) {
      if (["media", "content-audit-entries"].includes(collection)) continue;
      for (const row of rows) {
        Object.assign(row, {
          slug: `renamed-${row.id}`,
          question: "Renamed question",
          label: "Renamed label",
          order: 999,
          _status: "draft",
          content: { editorial: true },
        });
      }
    }
    const before = structuredClone({ records: store.records, globals: store.globals });
    store.clearWrites();
    await store.initialize();

    store.expectNoWrites();
    expect({ records: store.records, globals: store.globals }).toEqual(before);
    expect(store.client.find.mock.calls.some(([options]) =>
      options.collection === "pages" && "draft" in options && options.draft === true,
    )).toBe(true);
  });

  it("preserves completely deleted collections using their audit history", async () => {
    const store = seedStore();
    await store.initialize();
    for (const collection of ["pages", "faqs", "resources", "programme-statistics", "eligibility-content"]) {
      store.records.set(collection, []);
    }
    store.clearWrites();
    await store.initialize();

    store.expectNoWrites();
    expect(store.records.get("faqs")).toEqual([]);
    expect(store.records.get("resources")).toEqual([]);
  });

  it("preserves imported records without an audit history", async () => {
    const store = seedStore();
    for (const collection of ["pages", "faqs", "resources", "programme-statistics", "eligibility-content"]) {
      store.records.set(collection, [{ id: 80, title: "Imported draft", _status: "draft" }]);
    }
    await Promise.all([
      seedPages(store.payload), seedFaqs(store.payload),
      seedProgrammeContent(store.payload), seedResources(store.payload),
    ]);

    store.expectNoWrites();
  });

  it("initializes missing globals while retaining a saved draft and its image", async () => {
    const store = seedStore();
    const home = { updatedAt: "2026-10-07T09:00:00Z", _status: "draft", heroImage: 99 };
    store.globals.set("homepage", home);
    await seedSiteGlobals(store.payload);

    expect(store.globals.get("homepage")).toEqual(home);
    expect(store.client.updateGlobal).toHaveBeenCalledTimes(4);
    expect(store.client.create).not.toHaveBeenCalled();
    expect(store.client.findGlobal).toHaveBeenCalledWith(expect.objectContaining({
      slug: "homepage", draft: true, select: { createdAt: true, updatedAt: true },
    }));
  });
});
