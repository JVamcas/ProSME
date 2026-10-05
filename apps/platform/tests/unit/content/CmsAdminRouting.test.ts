import { beforeEach, describe, expect, it, vi } from "vitest";

const routing = vi.hoisted(() => ({
  rootPage: vi.fn().mockResolvedValue("CMS view"),
  redirect: vi.fn((path: string) => {
    throw new Error(`Redirect to ${path}`);
  }),
}));

vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("@payloadcms/next/views", () => ({ RootPage: routing.rootPage }));
vi.mock("next/navigation", () => ({ redirect: routing.redirect }));
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

  it.each(["home", "login"])("redirects /cms/%s to /cms", async (segment) => {
    await expect(PayloadAdminPage(pageProps([segment]))).rejects.toThrow(
      "Redirect to /cms",
    );
    expect(routing.redirect).toHaveBeenCalledWith("/cms");
    expect(routing.rootPage).not.toHaveBeenCalled();
  });

  it("continues rendering the Home banner global editor", async () => {
    await expect(
      PayloadAdminPage(pageProps(["globals", "homepage"])),
    ).resolves.toBe("CMS view");
    expect(routing.redirect).not.toHaveBeenCalled();
    expect(routing.rootPage).toHaveBeenCalledOnce();
  });
});
