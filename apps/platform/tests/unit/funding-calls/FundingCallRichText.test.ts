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
    ).toBe("Growth & jobs\nEquipment\nTraining");
  });

  it("keeps headings, paragraphs, and line breaks separate", () => {
    expect(
      richTextToPlainText(
        "<h2>EMPOWERING NAMIBIAN ENTREPRENEURS</h2><p>The SME Fund invites applicants.</p><h3>WHAT TO EXPECT</h3><p>Grant funding<br>Pitch coaching</p>",
      ),
    ).toBe(
      "EMPOWERING NAMIBIAN ENTREPRENEURS\nThe SME Fund invites applicants.\nWHAT TO EXPECT\nGrant funding\nPitch coaching",
    );
  });
});
