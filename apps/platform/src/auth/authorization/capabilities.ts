export const capabilities = {
  applicationCreate: "application.create",
  applicationReadOwn: "application.read.own",
  applicationSubmit: "application.submit",
  adminAccess: "admin.access",
  cmsAccess: "cms.access",
  cmsPrincipalsManage: "cms.principals.manage",
  cmsAuditRead: "cms.audit.read",
} as const;

export const cmsResources = [
  "pages",
  "news",
  "resources",
  "events",
  "faqs",
  "funding-calls",
  "eligibility",
  "statistics",
  "media",
  "site-settings",
  "engagement-submissions",
] as const;

export const cmsActions = ["read", "create", "update", "publish", "delete"] as const;

export type CmsResource = (typeof cmsResources)[number];
export type CmsAction = (typeof cmsActions)[number];
export type CmsCapability = `cms.${CmsResource}.${CmsAction}`;

export function cmsCapability(resource: CmsResource, action: CmsAction): CmsCapability {
  return `cms.${resource}.${action}`;
}

export type Capability =
  | (typeof capabilities)[keyof typeof capabilities]
  | CmsCapability;
