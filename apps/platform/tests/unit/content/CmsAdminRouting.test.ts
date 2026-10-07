import { beforeEach, describe, expect, it, vi } from "vitest";

const routing = vi.hoisted(() => ({
  rootPage: vi.fn().mockResolvedValue("CMS view"),
  pageSegments: vi.fn().mockResolvedValue(["collections", "pages", "42"]),
  notFound: vi.fn(() => { throw new Error("Not found"); }),
  redirect: vi.fn((path: string) => {
    throw new Error(`Redirect to ${path}`);
  }),
}));

vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("@payloadcms/next/views", () => ({ RootPage: routing.rootPage }));
vi.mock("next/navigation", () => ({ redirect: routing.redirect, notFound: routing.notFound }));
vi.mock("@/app/(payload)/cms/importMap", () => ({ importMap: {} }));
vi.mock("@/modules/content/ServerCmsPageEditorService", () => ({
  getPageEditorSegments: routing.pageSegments,
}));

import PayloadAdminPage from "@/app/(payload)/cms/[[...segments]]/page";

beforeEach(() => vi.clearAllMocks());

function editorPath(slug: string) {
  if (slug === "how-to-apply") return ["funding", "application-guide"];
  if (slug === "funding") return ["funding", "overview"];
  if (slug === "eligibility") return ["funding", "overview", "focus-sectors"];
  return [slug];
}

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

  it("opens Contact Us through the existing native global form", async () => {
    const props = {
      ...pageProps(["contact"]),
      searchParams: Promise.resolve({ locale: "en" }),
    };
    await expect(PayloadAdminPage(props)).resolves.toBe("CMS view");
    const args = routing.rootPage.mock.calls[0][0];
    await expect(args.params).resolves.toEqual({
      segments: ["globals", "contact-details"],
    });
    expect(args.searchParams).toBe(props.searchParams);
    expect(routing.pageSegments).not.toHaveBeenCalled();
  });

  it("redirects the contact global root to Contact Us", async () => {
    await expect(PayloadAdminPage(pageProps(["globals", "contact-details"])))
      .rejects.toThrow("Redirect to /cms/contact");
    expect(routing.rootPage).not.toHaveBeenCalled();
  });

  it("preserves native contact version history", async () => {
    const props = pageProps(["globals", "contact-details", "versions"]);
    await expect(PayloadAdminPage(props)).resolves.toBe("CMS view");
    expect(routing.rootPage.mock.calls[0][0].params).toBe(props.params);
  });

  it.each(["about", "how-to-apply", "funding", "eligibility", "faq"])(
    "opens the existing document through Payload at /cms/%s",
    async (slug) => {
      const props = pageProps(editorPath(slug));
      await expect(PayloadAdminPage(props)).resolves.toBe("CMS view");
      const args = routing.rootPage.mock.calls[0][0];
      await expect(args.params).resolves.toEqual({
        segments: ["collections", "pages", "42"],
      });
      await expect(args.searchParams).resolves.toEqual({ cmsPage: slug });
      expect(routing.pageSegments).toHaveBeenCalledWith(slug);
      expect(routing.redirect).not.toHaveBeenCalled();
    },
  );

  it.each(["about", "how-to-apply", "funding", "eligibility", "faq"])(
    "preserves preview options when opening %s",
    async (slug) => {
      await PayloadAdminPage({
        ...pageProps(editorPath(slug)),
        searchParams: Promise.resolve({ locale: "en" }),
      });
      await expect(routing.rootPage.mock.calls[0][0].searchParams).resolves.toEqual({
        locale: "en",
        cmsPage: slug,
      });
    },
  );

  it.each(["about", "how-to-apply", "funding", "eligibility", "faq"])(
    "does not render %s after an authorization failure",
    async (slug) => {
      routing.pageSegments.mockRejectedValueOnce(new Error("Permission denied"));
      await expect(PayloadAdminPage(pageProps(editorPath(slug)))).rejects.toThrow(
        "Permission denied",
      );
      expect(routing.rootPage).not.toHaveBeenCalled();
    },
  );
});
