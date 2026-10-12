import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FundingCallVersionContext } from "@/modules/funding-calls/ui/FundingCallVersionContext";
import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";

function render(values: Partial<FundingCallView>, editable = false) {
  return renderToStaticMarkup(
    <FundingCallVersionContext
      call={values as FundingCallView}
      editable={editable}
    />,
  );
}

describe("funding call version header", () => {
  it("distinguishes the source of a replacement from the current publication", () => {
    const html = render(
      {
        draftVersionId: "draft",
        currentPublishedVersionId: "v4",
        currentPublishedVersionNumber: 4,
        sourcePublishedVersionNumber: 2,
      },
      true,
    );
    expect(html).toContain("Editing: Replacement draft · Based on version 2");
    expect(html).toContain("Current published: Version 4");
    expect(html).not.toContain("Version 5");
  });
  it("identifies historical views as read-only", () => {
    const html = render({
      viewedPublishedVersionId: "v2",
      viewedPublishedVersionNumber: 2,
      currentPublishedVersionId: "v4",
      currentPublishedVersionNumber: 4,
    });
    expect(html).toContain("Viewing: Version 2 · Read-only");
    expect(html).toContain("Current published: Version 4");
  });
  it("identifies the current version and initial unpublished draft", () => {
    expect(
      render({
        currentPublishedVersionId: "v4",
        currentPublishedVersionNumber: 4,
      }),
    ).toContain("Viewing: Version 4");
    const initial = render({}, true);
    expect(initial).toContain("Editing: Initial unpublished version");
    expect(initial).toContain("No published version");
  });
});
