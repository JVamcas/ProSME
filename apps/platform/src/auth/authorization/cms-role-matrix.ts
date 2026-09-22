import {
  cmsPermissionCode,
  permissionCodes,
  type CmsPermissionAction,
  type CmsPermissionResource,
} from "./permissions";

const editorialResources: CmsPermissionResource[] = [
  "pages",
  "news",
  "resources",
  "events",
  "faqs",
];
const programmeResources: CmsPermissionResource[] = ["eligibility", "statistics"];

function grants(
  resources: CmsPermissionResource[],
  actions: CmsPermissionAction[],
) {
  return resources.flatMap((resource) =>
    actions.map((action) => cmsPermissionCode(resource, action)),
  );
}

const editActions: CmsPermissionAction[] = ["read", "create", "update"];
const publishActions: CmsPermissionAction[] = [...editActions, "publish"];
const manageActions: CmsPermissionAction[] = [...publishActions, "delete"];

export const cmsRoleCapabilities = {
  cms_administrator: [
    permissionCodes.cmsAccess,
    permissionCodes.cmsAuditRead,
    ...grants([...editorialResources, ...programmeResources], manageActions),
    ...grants(["media"], ["read", "create", "update", "delete"]),
    ...grants(["site-settings"], ["read", "update", "publish"]),
    ...grants(["engagement-submissions"], ["read", "update", "delete"]),
  ],
  cms_author: [
    permissionCodes.cmsAccess,
    ...grants(editorialResources, editActions),
    ...grants(["media"], ["read", "create"]),
  ],
  cms_editor: [
    permissionCodes.cmsAccess,
    ...grants(editorialResources, editActions),
    ...grants(["media"], editActions),
    ...grants(["site-settings"], ["read", "update"]),
  ],
  cms_reviewer: [
    permissionCodes.cmsAccess,
    permissionCodes.cmsAuditRead,
    ...grants(editorialResources, ["read", "update", "publish"]),
    ...grants(["media"], ["read"]),
    ...grants(["site-settings"], ["read", "update", "publish"]),
  ],
  programme_officer: [
    permissionCodes.cmsAccess,
    permissionCodes.cmsAuditRead,
    ...grants(programmeResources, manageActions),
    ...grants(["media"], ["read", "create", "update", "delete"]),
    ...grants(["engagement-submissions"], ["read", "update", "delete"]),
  ],
  system_administrator: [
    permissionCodes.cmsAccess,
    permissionCodes.cmsAuditRead,
    permissionCodes.cmsPrincipalsManage,
    ...grants([...editorialResources, ...programmeResources], manageActions),
    ...grants(["media"], ["read", "create", "update", "delete"]),
    ...grants(["site-settings"], ["read", "update", "publish"]),
    ...grants(["engagement-submissions"], ["read", "update", "delete"]),
  ],
} as const;

export type CmsRoleCode = keyof typeof cmsRoleCapabilities;
