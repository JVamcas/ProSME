export const capabilities = {
  profileReadOwn: "profile.read.own",
  profileUpdateOwn: "profile.update.own",
  businessReadOwn: "business.read.own",
  businessUpdateOwn: "business.update.own",
  eligibilityCreate: "eligibility.create",
  eligibilityReadOwn: "eligibility.read.own",
  applicationCreate: "application.create",
  applicationReadOwn: "application.read.own",
  applicationReadAssigned: "application.read.assigned",
  applicationReadAll: "application.read.all",
  applicationUpdateOwn: "application.update.own",
  applicationSubmit: "application.submit",
  documentReadOwn: "document.read.own",
  documentUploadOwn: "document.upload.own",
  informationRequestReadOwn: "information_request.read.own",
  informationRequestRespondOwn: "information_request.respond.own",
  messageReadOwn: "message.read.own",
  notificationReadOwn: "notification.read.own",
  resourceSaveOwn: "resource.save.own",
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

export function cmsCapability(
  resource: CmsResource,
  action: CmsAction,
): CmsCapability {
  return `cms.${resource}.${action}`;
}

export type Capability =
  | (typeof capabilities)[keyof typeof capabilities]
  | CmsCapability;
