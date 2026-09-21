import {
  capabilities,
  cmsCapability,
  type CmsAction,
  type CmsResource,
} from "./capabilities";

const editorialResources: CmsResource[] = ["pages", "news", "resources", "events", "faqs"];
const programmeResources: CmsResource[] = ["eligibility", "statistics"];

function grants(resources: CmsResource[], actions: CmsAction[]) {
  return resources.flatMap((resource) =>
    actions.map((action) => cmsCapability(resource, action)),
  );
}

const editActions: CmsAction[] = ["read", "create", "update"];
const publishActions: CmsAction[] = [...editActions, "publish"];
const manageActions: CmsAction[] = [...publishActions, "delete"];

export const cmsRoleCapabilities = {
  cms_administrator: [
    capabilities.cmsAccess,
    capabilities.cmsAuditRead,
    ...grants([...editorialResources, ...programmeResources], manageActions),
    ...grants(["media"], ["read", "create", "update", "delete"]),
    ...grants(["site-settings"], ["read", "update", "publish"]),
    ...grants(["engagement-submissions"], ["read", "update", "delete"]),
  ],
  cms_author: [
    capabilities.cmsAccess,
    ...grants(editorialResources, editActions),
    ...grants(["media"], ["read", "create"]),
  ],
  cms_editor: [
    capabilities.cmsAccess,
    ...grants(editorialResources, editActions),
    ...grants(["media"], editActions),
    ...grants(["site-settings"], ["read", "update"]),
  ],
  cms_reviewer: [
    capabilities.cmsAccess,
    capabilities.cmsAuditRead,
    ...grants(editorialResources, ["read", "update", "publish"]),
    ...grants(["media"], ["read"]),
    ...grants(["site-settings"], ["read", "update", "publish"]),
  ],
  programme_officer: [
    capabilities.adminAccess,
    capabilities.cmsAccess,
    capabilities.cmsAuditRead,
    ...grants(programmeResources, manageActions),
    ...grants(["media"], ["read", "create", "update", "delete"]),
    ...grants(["engagement-submissions"], ["read", "update", "delete"]),
  ],
  system_administrator: [
    capabilities.adminAccess,
    capabilities.cmsAccess,
    capabilities.cmsAuditRead,
    capabilities.cmsPrincipalsManage,
    ...grants([...editorialResources, ...programmeResources], manageActions),
    ...grants(["media"], ["read", "create", "update", "delete"]),
    ...grants(["site-settings"], ["read", "update", "publish"]),
    ...grants(["engagement-submissions"], ["read", "update", "delete"]),
  ],
} as const;

export type CmsRoleCode = keyof typeof cmsRoleCapabilities;
