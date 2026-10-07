import type { SanitizedConfig } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  payload: { logger: { info: vi.fn() } },
  req: { transactionID: "seed-transaction" },
  getPayload: vi.fn(),
  createLocalReq: vi.fn(),
  init: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  globals: vi.fn(),
  pages: vi.fn(),
  faqs: vi.fn(),
  programme: vi.fn(),
  resources: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("payload", () => ({
  getPayload: state.getPayload,
  createLocalReq: state.createLocalReq,
  initTransaction: state.init,
  commitTransaction: state.commit,
  killTransaction: state.rollback,
}));
vi.mock("@/payload/seed/seed-site-globals", () => ({ seedSiteGlobals: state.globals }));
vi.mock("@/payload/seed/seed-editorial", () => ({ seedPages: state.pages, seedFaqs: state.faqs }));
vi.mock("@/payload/seed/seed-programme", () => ({ seedProgrammeContent: state.programme }));
vi.mock("@/payload/seed/seed-resources", () => ({ seedResources: state.resources }));

import { script } from "@/payload/seed/seed";

const config = {} as SanitizedConfig;
const originalExitCode = process.exitCode;

beforeEach(() => {
  vi.resetAllMocks();
  state.getPayload.mockResolvedValue(state.payload);
  state.createLocalReq.mockResolvedValue(state.req);
  state.init.mockResolvedValue(true);
});

afterEach(() => {
  process.exitCode = originalExitCode;
});

describe("CMS seed transaction", () => {
  it("shares one transaction across all CMS seeds and commits after they complete", async () => {
    await script(config);

    for (const seed of [state.globals, state.pages, state.faqs, state.programme, state.resources]) {
      expect(seed).toHaveBeenCalledWith(state.payload, state.req);
    }
    expect(state.commit).toHaveBeenCalledWith(state.req);
    expect(state.rollback).not.toHaveBeenCalled();
  });

  it("rolls back an initialization failure without running later seeds", async () => {
    state.pages.mockRejectedValue(new Error("Failed to create page"));
    await expect(script(config)).rejects.toThrow("Failed to create page");

    expect(state.rollback).toHaveBeenCalledWith(state.req);
    expect(state.faqs).not.toHaveBeenCalled();
    expect(state.programme).not.toHaveBeenCalled();
    expect(state.resources).not.toHaveBeenCalled();
    expect(state.commit).not.toHaveBeenCalled();
    expect(state.payload.logger.info).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("does not seed when a transaction cannot be started", async () => {
    state.init.mockResolvedValue(false);
    await expect(script(config)).rejects.toThrow("requires a database transaction");

    expect(state.globals).not.toHaveBeenCalled();
    expect(state.pages).not.toHaveBeenCalled();
    expect(state.commit).not.toHaveBeenCalled();
  });
});
