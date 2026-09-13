import { describe, expect, it } from "vitest";

import { cmsCapability } from "@/auth/authorization/capabilities";
import { cmsRoleCapabilities } from "@/auth/authorization/cms-role-matrix";
import {
  canAccessCms,
  canManageCmsPrincipals,
  hasCmsCapability,
} from "@/payload/access/can-access-cms";
import { enforceCmsPublishing } from "@/payload/access/can-publish-content";
import {
  cmsCollectionAccess,
  cmsGlobalAccess,
} from "@/payload/access/cms-resource-access";
import { CmsPrincipals } from "@/payload/collections/system/CmsPrincipals";

function request(capabilities: readonly string[]) {
  return { user: { capabilities } } as never;
}

function access(
  resource: "news" | "funding-calls",
  action: "create" | "read" | "update" | "delete",
  granted: string[],
) {
  const policy = cmsCollectionAccess(resource)?.[action];

  if (typeof policy !== "function") {
    throw new Error(`Missing ${resource}.${action} policy`);
  }

  return policy({ req: request(granted) } as never);
}

describe("Payload content authorization", () => {
  it("reads capabilities attached by the Firebase session strategy", () => {
    expect(hasCmsCapability({ capabilities: ["cms.access"] }, "cms.access")).toBe(true);
    expect(hasCmsCapability({ capabilities: [] }, "cms.access")).toBe(false);
    expect(hasCmsCapability(null, "cms.access")).toBe(false);
    expect(canAccessCms({ req: request([]) } as never)).toBe(false);
  });

  it("blocks publishing without the explicit publish capability", () => {
    const operation = () =>
      enforceCmsPublishing("news", {
        data: { _status: "published" },
        req: request([cmsCapability("news", "update")]),
      });

    expect(operation).toThrow(
      "Publishing requires the cms.news.publish capability",
    );
  });

  it("allows draft updates and authorized publishing", () => {
    const draft = { _status: "draft" };
    const published = { _status: "published", reviewStatus: "approved" };
    expect(
      enforceCmsPublishing("news", {
        data: draft,
        req: request([]),
      }),
    ).toBe(draft);
    expect(
      enforceCmsPublishing("news", {
        data: published,
        req: request([cmsCapability("news", "publish")]),
      }),
    ).toBe(published);
  });

  it("applies the same publishing permission to site globals", () => {
    const published = { _status: "published", reviewStatus: "approved" };
    expect(() =>
      enforceCmsPublishing("site-settings", {
        data: published,
        req: request([]),
      }),
    ).toThrow("cms.site-settings.publish");
    expect(
      enforceCmsPublishing("site-settings", {
        data: published,
        req: request([cmsCapability("site-settings", "publish")]),
      }),
    ).toBe(published);
  });

  it("requires approval before an authorized reviewer can publish", () => {
    expect(() =>
      enforceCmsPublishing("news", {
        data: { _status: "published", reviewStatus: "inReview" },
        req: request([cmsCapability("news", "publish")]),
      }),
    ).toThrow("Content must be approved");
  });

  it("prevents editors from approving and returns edited approved content to review", () => {
    expect(() =>
      enforceCmsPublishing("news", {
        data: { _status: "draft", reviewStatus: "approved" },
        originalDoc: { reviewStatus: "draft" },
        req: request([cmsCapability("news", "update")]),
      }),
    ).toThrow("Approval requires the cms.news.publish capability");
    const data = { _status: "draft", reviewStatus: "approved" };

    expect(
      enforceCmsPublishing("news", {
        data,
        originalDoc: { reviewStatus: "approved" },
        req: request([cmsCapability("news", "update")]),
      }),
    ).toEqual({ _status: "draft", reviewStatus: "inReview" });
  });

  it("isolates News permissions from Funding Calls and Site Settings", () => {
    const granted = [
      cmsCapability("news", "read"),
      cmsCapability("news", "update"),
    ];

    expect(access("news", "update", granted)).toBe(true);
    expect(access("funding-calls", "update", granted)).toBe(false);
    expect(
      cmsCollectionAccess("funding-calls")?.admin?.({
        req: request(granted),
      }),
    ).toBe(false);
    const updateGlobal = cmsGlobalAccess()?.update;

    if (typeof updateGlobal !== "function") {
      throw new Error("Missing site settings policy");
    }

    expect(updateGlobal({ req: request(granted) } as never)).toBe(false);
  });

  it("keeps the TOR CMS and programme roles separated", () => {
    expect(
      access("news", "create", [...cmsRoleCapabilities.cms_editor]),
    ).toBe(true);
    expect(
      access("news", "update", [...cmsRoleCapabilities.cms_editor]),
    ).toBe(true);
    expect(cmsRoleCapabilities.cms_author).toContain(
      cmsCapability("news", "update"),
    );
    expect(cmsRoleCapabilities.cms_author).not.toContain(
      cmsCapability("news", "publish") as never,
    );
    expect(cmsRoleCapabilities.cms_editor).toContain(
      cmsCapability("news", "update"),
    );
    expect(cmsRoleCapabilities.cms_editor).not.toContain(
      cmsCapability("news", "publish") as never,
    );
    expect(cmsRoleCapabilities.cms_reviewer).toContain(
      cmsCapability("news", "publish"),
    );
    expect(cmsRoleCapabilities.cms_administrator).toContain(
      cmsCapability("funding-calls", "delete"),
    );
    expect(cmsRoleCapabilities.cms_administrator).not.toContain(
      "cms.principals.manage" as never,
    );
    expect(cmsRoleCapabilities.programme_officer).toContain(
      cmsCapability("funding-calls", "publish"),
    );
    expect(cmsRoleCapabilities.programme_officer).not.toContain(
      cmsCapability("news", "update") as never,
    );
    expect(cmsRoleCapabilities.system_administrator).toContain(
      "cms.principals.manage",
    );
  });

  it("restricts the principal mirror to system administrators", () => {
    expect(
      canManageCmsPrincipals({
        req: request(cmsRoleCapabilities.cms_administrator),
      } as never),
    ).toBe(false);
    expect(
      canManageCmsPrincipals({
        req: request(cmsRoleCapabilities.system_administrator),
      } as never),
    ).toBe(true);
  });

  it("prevents every Payload user from mutating principal mirrors", () => {
    const systemRequest = {
      req: request(cmsRoleCapabilities.system_administrator),
    } as never;
    const editorRequest = {
      req: request(cmsRoleCapabilities.cms_editor),
    } as never;

    expect(CmsPrincipals.access?.admin?.(editorRequest)).toBe(true);
    expect(CmsPrincipals.access?.create?.(systemRequest)).toBe(false);
    expect(CmsPrincipals.access?.update?.(systemRequest)).toBe(false);
    expect(CmsPrincipals.access?.delete?.(systemRequest)).toBe(false);
  });
});
