import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/branding/application/ServerBrandingService", () => ({
  readBrandingLogo: vi.fn(),
}));

import { readBrandingLogo } from "@/modules/branding/application/ServerBrandingService";
import {
  loadNotificationBrandingLogoAttachment,
} from "@/modules/notifications/application/ServerNotificationEmailBranding";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notification email branding", () => {
  it("converts an SVG logo to an email-safe inline PNG attachment", async () => {
    vi.mocked(readBrandingLogo).mockResolvedValue({
      body: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">'
          + '<rect width="10" height="10" fill="#0a183b"/></svg>',
      ),
      contentType: "image/svg+xml",
      updatedAt: null,
    });

    const attachment = await loadNotificationBrandingLogoAttachment();

    expect(attachment).toMatchObject({
      cid: "sme-fund-branding-logo",
      contentType: "image/png",
      filename: "sme-fund-logo.png",
    });
    expect(attachment.content.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  });
});
