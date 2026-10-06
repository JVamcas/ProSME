import { describe, expect, it, vi } from "vitest";
import type { CollectionBeforeValidateHook, PayloadRequest } from "payload";

vi.mock("payload", () => ({ APIError: class extends Error {} }));
import { prepareResource } from "@/modules/content/ResourcePublishing";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { enforceCmsPublishing } from "@/payload/access/can-publish-content";

function prepare(data: Record<string, unknown>, originalDoc?: Record<string, unknown>) {
  return prepareResource({
    data,
    originalDoc,
    req: {} as PayloadRequest,
  } as Parameters<CollectionBeforeValidateHook>[0]);
}

describe("Resource publishing", () => {
  it.each(["create", "update", "delete"] as const)(
    "requires the matching Resource Centre %s grant", (action) => {
      const policy = cmsCollectionAccess("resources")?.[action];
      if (typeof policy !== "function") throw new Error("Missing resource policy");
      const allowed = { user: { capabilities: [cmsPermissionCode("resources", action)] } };
      const denied = { user: { capabilities: [cmsPermissionCode("news", action)] } };
      expect(policy({ req: allowed } as never)).toBe(true);
      expect(policy({ req: denied } as never)).toBe(false);
    },
  );

  it("requires resource publish permission before approving a resource", () => {
    const draft = { _status: "published", reviewStatus: "draft" };
    expect(() => enforceCmsPublishing("resources", {
      data: { ...draft },
      req: { user: { capabilities: [cmsPermissionCode("resources", "update")] } } as never,
    }, { approveOnPublish: true })).toThrow("cms.resources.publish");
    expect(enforceCmsPublishing("resources", {
      data: { ...draft },
      req: { user: { capabilities: [cmsPermissionCode("resources", "publish")] } } as never,
    }, { approveOnPublish: true })).toMatchObject({ reviewStatus: "approved" });
  });
  it("generates a slug for a new resource and preserves a published slug on title edits", () => {
    expect(prepare({ title: "Business & funding guide" })).toMatchObject({ slug: "business-funding-guide" });
    expect(prepare({ title: "New title" }, { slug: "existing-slug" })).not.toHaveProperty("slug");
  });

  it("retains legacy category labels when editing existing resources", () => {
    expect(prepare({}, { category: "Application guide" })).toMatchObject({ resourceName: "Application guide" });
  });

  it("allows a draft without an upload but requires a document to publish", () => {
    expect(() => prepare({ _status: "draft" })).not.toThrow();
    expect(() => prepare({ _status: "published" })).toThrow("Upload a document");
  });

  it("accepts an uploaded document or a legacy document link", () => {
    expect(() => prepare({ _status: "published", file: 7 })).not.toThrow();
    expect(() => prepare({ _status: "published", externalUrl: "/guide.pdf" })).not.toThrow();
  });

  it("prevents clearing the last source on a published resource, including partial updates", () => {
    expect(() => prepare({ file: null }, { _status: "published", file: 7 }))
      .toThrow("Upload a document");
  });
});
