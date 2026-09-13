import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/ui/status-badge";

describe("shared status badge", () => {
  it.each([
    ["open", "Open", "bg-brand-green/40"],
    ["upcoming", "Upcoming", "bg-brand-yellow"],
    ["closed", "Closed", "bg-red-500"],
    ["Technical Assessment", "Technical Assessment", "bg-brand-blue/40"],
  ])("renders %s with its static status style", (status, label, style) => {
    const markup = renderToStaticMarkup(<StatusBadge status={status} />);

    expect(markup).toContain(label);
    expect(markup).toContain(style);
  });

  it("supports a custom label and class name", () => {
    const markup = renderToStaticMarkup(
      <StatusBadge
        className="ring-1 ring-brand-navy"
        label="Accepting applications"
        status="open"
      />,
    );

    expect(markup).toContain("Accepting applications");
    expect(markup).toContain("ring-brand-navy");
  });
});
