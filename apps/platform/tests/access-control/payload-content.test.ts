import { describe, expect, it } from "vitest";

import { hasCmsCapability } from "@/payload/access/can-access-cms";
import { enforcePublishCapability } from "@/payload/access/can-publish-content";

describe("Payload content authorization", () => {
  it("reads capabilities attached by the Firebase session strategy", () => {
    expect(hasCmsCapability({ capabilities: ["cms.access"] }, "cms.access")).toBe(true);
    expect(hasCmsCapability({ capabilities: [] }, "cms.access")).toBe(false);
    expect(hasCmsCapability(null, "cms.access")).toBe(false);
  });

  it("blocks publishing without the explicit publish capability", () => {
    const operation = () => enforcePublishCapability({
      data: { _status: "published" },
      req: { user: { capabilities: ["content.update"] } },
    } as never);
    expect(operation).toThrow("Publishing requires the content.publish capability");
  });

  it("allows draft updates and authorized publishing", () => {
    const draft = { _status: "draft" };
    const published = { _status: "published" };
    expect(enforcePublishCapability({ data: draft, req: { user: null } } as never)).toBe(draft);
    expect(enforcePublishCapability({
      data: published,
      req: { user: { capabilities: ["content.publish"] } },
    } as never)).toBe(published);
  });
});
