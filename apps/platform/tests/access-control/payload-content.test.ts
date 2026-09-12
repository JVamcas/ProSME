import { describe, expect, it } from "vitest";

import { hasCmsCapability } from "@/payload/access/can-access-cms";
import { enforceGlobalPublishCapability, enforcePublishCapability } from "@/payload/access/can-publish-content";

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
    const published = { _status: "published", reviewStatus: "approved" };
    expect(enforcePublishCapability({ data: draft, req: { user: null } } as never)).toBe(draft);
    expect(enforcePublishCapability({
      data: published,
      req: { user: { capabilities: ["content.publish"] } },
    } as never)).toBe(published);
  });

  it("applies the same publishing permission to site globals", () => {
    const published = { _status: "published", reviewStatus: "approved" };
    expect(() => enforceGlobalPublishCapability({ data: published, req: { user: null } } as never)).toThrow("Publishing requires the content.publish capability");
    expect(enforceGlobalPublishCapability({ data: published, req: { user: { capabilities: ["content.publish"] } } } as never)).toBe(published);
  });

  it("requires approval before an authorized publisher can publish", () => {
    expect(() => enforcePublishCapability({
      data: { _status: "published", reviewStatus: "inReview" },
      req: { user: { capabilities: ["content.publish"] } },
    } as never)).toThrow("Content must be approved");
  });

  it("prevents editors from approving and returns edited approved content to review", () => {
    expect(() => enforcePublishCapability({
      data: { _status: "draft", reviewStatus: "approved" },
      originalDoc: { reviewStatus: "draft" },
      req: { user: { capabilities: ["content.update"] } },
    } as never)).toThrow("Approval requires the content.publish capability");
    const data = { _status: "draft", reviewStatus: "approved" };
    expect(enforcePublishCapability({ data, originalDoc: { reviewStatus: "approved" }, req: { user: { capabilities: ["content.update"] } } } as never)).toEqual({ _status: "draft", reviewStatus: "inReview" });
  });
});
