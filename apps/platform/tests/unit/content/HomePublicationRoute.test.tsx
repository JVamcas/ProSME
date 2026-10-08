import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildHomepage } from "@/modules/content/ContentBuildFallbacks";

const state = vi.hoisted(() => ({
  homepage: vi.fn(),
  fundingCalls: vi.fn(),
  preview: false,
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("next/headers", () => ({ draftMode: async () => ({ isEnabled: state.preview }) }));
vi.mock("next/navigation", () => ({ notFound: state.notFound }));
vi.mock("@/modules/content/ServerContentQueries", () => ({ getHomepage: state.homepage }));
vi.mock("@/modules/funding-calls/application/ServerPublicFundingCallService", () => ({
  listPublicFundingCalls: state.fundingCalls,
}));
vi.mock("@/modules/content/ui/public/ContentBlocks", () => ({ ContentBlocks: () => null }));

import HomePage from "@/app/(public)/page";

beforeEach(() => {
  vi.clearAllMocks();
  state.preview = false;
  state.homepage.mockResolvedValue({ ...buildHomepage, title: "Published Home" });
  state.fundingCalls.mockResolvedValue({ items: [], total: 0 });
});

describe("Home publication route", () => {
  it("renders published content", async () => {
    const markup = renderToStaticMarkup(await HomePage());
    expect(markup).toContain("Published Home");
    expect(markup).not.toContain("Draft preview");
    expect(state.notFound).not.toHaveBeenCalled();
  });

  it.each([false, true])("returns not-found for absent Home content with preview cookie %s", async (preview) => {
    state.preview = preview;
    state.homepage.mockResolvedValue(null);
    await expect(HomePage()).rejects.toThrow("NOT_FOUND");
    expect(state.notFound).toHaveBeenCalledOnce();
  });

  it("renders an authorized draft supplied by the service with an exit link", async () => {
    state.preview = true;
    state.homepage.mockResolvedValue({ ...buildHomepage, title: "Pending Home" });
    const markup = renderToStaticMarkup(await HomePage());
    expect(markup).toContain("Pending Home");
    expect(markup).toContain("Draft preview");
    expect(markup).toContain('href="/api/preview/exit"');
    expect(state.notFound).not.toHaveBeenCalled();
  });
});
