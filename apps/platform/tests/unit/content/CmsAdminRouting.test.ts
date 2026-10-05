import { beforeEach, describe, expect, it, vi } from "vitest";

const routing = vi.hoisted(() => ({
  rootPage: vi.fn().mockResolvedValue("CMS view"),
  notFound: vi.fn(() => { throw new Error("Not found"); }),
  redirect: vi.fn((path: string) => {
    throw new Error(`Redirect to ${path}`);
  }),
}));

vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("@payloadcms/next/views", () => ({ RootPage: routing.rootPage }));
vi.mock("next/navigation", () => ({ redirect: routing.redirect, notFound: routing.notFound }));
vi.mock("@/app/(payload)/cms/importMap", () => ({ importMap: {} }));

import PayloadAdminPage from "@/app/(payload)/cms/[[...segments]]/page";

beforeEach(() => vi.clearAllMocks());

function pageProps(segments: string[]) {
  return {
    params: Promise.resolve({ segments }),
    searchParams: Promise.resolve({}),
  };
}

describe("CMS admin routing", () => {
  it("renders the configured dashboard at /cms", async () => {
    const props = pageProps([]);
    await expect(PayloadAdminPage(props)).resolves.toBe("CMS view");
    expect(routing.rootPage).toHaveBeenCalledWith({
      config: {},
      importMap: {},
      ...props,
    });
    expect(routing.redirect).not.toHaveBeenCalled();
  });

  it("redirects Payload login to the application entry", async () => {
    await expect(PayloadAdminPage(pageProps(["login"]))).rejects.toThrow(
      "Redirect to /cms",
    );
  });

  it.each([["home"], ["globals", "homepage"]])(
    "opens Banner instead of the combined homepage editor at %j",
    async (...segments) => {
      await expect(PayloadAdminPage(pageProps(segments))).rejects.toThrow(
        "Redirect to /cms/home/banner",
      );
      expect(routing.rootPage).not.toHaveBeenCalled();
    },
  );

  it.each(["banner", "action-cards", "how-it-works", "who-we-support", "additional-content"])(
    "renders the native homepage form at /cms/home/%s",
    async (section) => {
      const props = pageProps(["home", section]);
      await expect(PayloadAdminPage(props)).resolves.toBe("CMS view");
      const args = routing.rootPage.mock.calls[0][0];
      await expect(args.params).resolves.toEqual({
        segments: ["globals", "homepage"],
      });
      expect(args.searchParams).toBe(props.searchParams);
      expect(routing.redirect).not.toHaveBeenCalled();
    },
  );

  it.each([["home", "unknown"], ["home", "banner", "extra"]])(
    "rejects unknown section paths %j",
    async (...segments) => {
      await expect(PayloadAdminPage(pageProps(segments))).rejects.toThrow("Not found");
      expect(routing.rootPage).not.toHaveBeenCalled();
    },
  );

  it("preserves native homepage version history", async () => {
    const props = pageProps(["globals", "homepage", "versions"]);
    await expect(PayloadAdminPage(props)).resolves.toBe("CMS view");
    expect(routing.rootPage.mock.calls[0][0].params).toBe(props.params);
  });
});
