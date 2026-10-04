import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", () => ({ useLinkStatus: () => state }));
import { NavigationPendingIndicator } from "@/shared/ui/portal/NavigationPendingIndicator";
import { PortalPageSkeleton } from "@/shared/ui/portal/PortalPageSkeleton";

beforeEach(() => { state.pending = false; });

describe("portal navigation feedback", () => {
  it("announces the router's pending transition accessibly", () => {
    state.pending = true;
    const markup = renderToStaticMarkup(<NavigationPendingIndicator />);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Opening page");
  });

  it("clears feedback when the router finishes or supersedes it", () => {
    state.pending = true;
    expect(renderToStaticMarkup(<NavigationPendingIndicator />)).not.toBe("");
    state.pending = false;
    expect(renderToStaticMarkup(<NavigationPendingIndicator />)).toBe("");
  });

  it("renders loading as placeholders rather than fabricated values", () => {
    const markup = renderToStaticMarkup(<PortalPageSkeleton />);
    expect(markup).toContain("Loading page content");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("No applications");
    expect(markup).not.toMatch(/>0</);
  });
});
