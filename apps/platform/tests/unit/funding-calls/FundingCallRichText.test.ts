import { describe, expect, it } from "vitest";

import { sanitizeFundingCallDescription } from "@/modules/funding-calls/infrastructure/FundingCallRichText";
import { richTextToPlainText } from "@/shared/utils/RichText";

describe("funding call rich text", () => {
  it("preserves supported formatting and removes unsafe markup", () => {
    const result = sanitizeFundingCallDescription(
      '<h2>Growth</h2><p onclick="alert(1)"><strong>Eligible</strong></p><script>alert(2)</script>',
    );

    expect(result).toBe("<h2>Growth</h2><p><strong>Eligible</strong></p>");
  });

  it("derives readable plain text for summaries", () => {
    expect(
      richTextToPlainText(
        "<p>Growth &amp; jobs</p><ul><li>Equipment</li><li>Training</li></ul>",
      ),
    ).toBe("Growth & jobs Equipment Training");
  });
});
