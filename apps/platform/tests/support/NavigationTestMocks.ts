import { vi } from "vitest";

const navigationTestRouter = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationTestRouter,
  usePathname: () => "/admin/editor",
  useSearchParams: () => new URLSearchParams(),
}));
