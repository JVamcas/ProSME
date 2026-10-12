import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock(
  "@/modules/content/infrastructure/PublicPageVisibilityRepository",
  () => ({ readPublicPageVisibility: state.read }),
);
import {
  requirePublicPage,
  requirePublicPath,
} from "@/modules/content/application/ServerPublicPageVisibilityService";
import { PublicPageVisibility } from "@/payload/globals/PublicPageVisibility";
import { cmsPermissionCode } from "@/auth/authorization/permissions";

beforeEach(() => state.read.mockReset().mockResolvedValue({}));

describe("public visibility boundaries", () => {
  it("returns 404 for hidden pages and descendants", async () => {
    state.read.mockResolvedValue({ news: false, funding: false });
    await expect(requirePublicPage("news")).rejects.toThrow("404");
    await expect(requirePublicPage("funding.overview.support")).rejects.toThrow(
      "404",
    );
    await expect(requirePublicPath("/news/42")).rejects.toThrow("404");
    await expect(requirePublicPage("about")).resolves.toBeUndefined();
  });

  it("requires the existing site settings update permission for writes", async () => {
    const update = PublicPageVisibility.access?.update;
    if (!update) throw new Error("Missing visibility update policy");
    const check = (capabilities: string[]) =>
      update({ req: { user: { capabilities } } } as never);
    expect(await check([])).toBe(false);
    expect(await check([cmsPermissionCode("news", "update")])).toBe(false);
    expect(await check([cmsPermissionCode("site-settings", "update")])).toBe(
      true,
    );
    expect(await update({ req: { user: null } } as never)).toBe(false);
  });
});
