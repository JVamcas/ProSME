export const capabilities = {
  applicationCreate: "application.create",
  applicationReadOwn: "application.read.own",
  applicationSubmit: "application.submit",
  adminAccess: "admin.access",
  cmsAccess: "cms.access",
  contentCreate: "content.create",
  contentUpdate: "content.update",
  contentPublish: "content.publish",
  contentDelete: "content.delete",
} as const;

export type Capability = (typeof capabilities)[keyof typeof capabilities];
