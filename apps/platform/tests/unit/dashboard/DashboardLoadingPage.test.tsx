import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/admin" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("@/shared/ui/portal/capability-context", () => ({
  usePortalContext: () => ({ displayName: "Synthetic Applicant" }),
}));

import { DashboardLoadingPage } from "@/modules/dashboard/ui/DashboardLoadingPage";

it.each([
  ["/admin", false, "Dashboard"],
  ["/portal", true, "Welcome back, Synthetic Applicant"],
  ["/admin/funding-calls", false, "Opening page"],
  ["/portal/applications", true, "Opening page"],
])(
  "uses truthful destination placeholders for %s",
  (pathname, applicant, title) => {
    navigation.pathname = pathname;
    const markup = renderToStaticMarkup(
      <DashboardLoadingPage applicant={applicant} />,
    );
    expect(markup).toContain(title);
    expect(markup).toContain("data-page-loading");
    expect(markup).not.toContain("Total applications");
    expect(markup).not.toContain("No applications");
  },
);
