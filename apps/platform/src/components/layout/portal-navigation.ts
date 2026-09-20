import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  ListTodo,
  LayoutDashboard,
  Store,
  Settings,
  UsersRound,
  UserRound,
  Workflow,
} from "lucide-react";

import { capabilities } from "@/auth/authorization/capabilities";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { PortalSpace } from "@/auth/authorization/portal-access";

export type PortalRoute = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  space: PortalSpace;
  openInNewTab?: boolean;
  requiredPermission?: string;
  requiredAnyPermissions?: readonly string[];
  requiredAllCapabilities?: readonly string[];
  children?: readonly PortalRoute[];
};

export const applicantPortalRoutes: readonly PortalRoute[] = [
  {
    id: "applicant-dashboard",
    href: "/portal",
    label: "Dashboard",
    icon: LayoutDashboard,
    space: "applicant",
  },
  {
    id: "funding-opportunities",
    href: "/portal/funding-opportunities",
    label: "Funding opportunities",
    icon: BriefcaseBusiness,
    space: "applicant",
  },
  {
    id: "applicant-businesses",
    href: "/portal/businesses",
    label: "My businesses",
    icon: Store,
    space: "applicant",
    requiredPermission: capabilities.businessReadOwn,
  },
  {
    id: "applicant-applications",
    href: "/portal/applications",
    label: "My applications",
    icon: ClipboardList,
    space: "applicant",
    requiredPermission: capabilities.applicationReadOwn,
  },
  {
    id: "applicant-notifications",
    href: "/portal/notifications",
    label: "Notifications",
    icon: Bell,
    space: "applicant",
    requiredPermission: capabilities.notificationReadOwn,
  },
  {
    id: "applicant-profile",
    href: "/portal/profile",
    label: "My profile",
    icon: UserRound,
    space: "applicant",
    requiredAnyPermissions: [capabilities.profileReadOwn],
  },
];

export const operationsPortalRoutes: readonly PortalRoute[] = [
  {
    id: "admin-dashboard",
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    space: "operations",
    requiredPermission: capabilities.adminAccess,
  },
  {
    id: "admin-work-queue",
    href: "/admin/work-queue",
    label: "My Work Queue",
    icon: ListTodo,
    space: "operations",
    requiredPermission: capabilities.workQueueRead,
  },
  {
    id: "admin-applications",
    href: "/admin/applications",
    label: "Applications",
    icon: ClipboardList,
    space: "operations",
    requiredAnyPermissions: [
      capabilities.applicationReadAssigned,
      capabilities.applicationReadAll,
    ],
  },
  {
    id: "admin-cms",
    href: "/cms",
    label: "Content management",
    icon: FileText,
    space: "operations",
    requiredPermission: capabilities.cmsAccess,
  },
  {
    id: "admin-settings",
    href: "/admin/settings",
    label: "Administration",
    icon: Settings,
    space: "operations",
    requiredAnyPermissions: [
      permissionCodes.workflowFormRead,
      permissionCodes.workflowFormCreate,
      permissionCodes.workflowFormUpdate,
      permissionCodes.workflowFormPublish,
      permissionCodes.workflowFormRetire,
      permissionCodes.workflowDefinitionRead,
      permissionCodes.workflowDefinitionCreate,
      permissionCodes.workflowDefinitionUpdate,
      permissionCodes.workflowDefinitionPublish,
      permissionCodes.workflowDefinitionRetire,
    ],
    children: [
      {
        id: "admin-settings-forms",
        href: "/admin/settings/forms",
        label: "Forms",
        icon: ClipboardList,
        space: "operations",
        requiredAnyPermissions: [
          permissionCodes.workflowFormRead,
          permissionCodes.workflowFormCreate,
          permissionCodes.workflowFormUpdate,
          permissionCodes.workflowFormPublish,
          permissionCodes.workflowFormRetire,
        ],
      },
      {
        id: "admin-workflows",
        href: "/admin/workflows",
        label: "Workflow Templates",
        icon: Workflow,
        space: "operations",
        requiredAnyPermissions: [
          permissionCodes.workflowDefinitionRead,
          permissionCodes.workflowDefinitionCreate,
          permissionCodes.workflowDefinitionUpdate,
          permissionCodes.workflowDefinitionPublish,
          permissionCodes.workflowDefinitionRetire,
        ],
      },
    ],
  },
  {
    id: "admin-users",
    href: "/admin/users",
    label: "Users & access",
    icon: UsersRound,
    space: "operations",
    requiredAnyPermissions: [
      capabilities.userRead,
      capabilities.userManage,
      capabilities.roleRead,
      capabilities.roleManage,
    ],
  },
];

export const portalRoutes: readonly PortalRoute[] = [
  ...applicantPortalRoutes,
  ...operationsPortalRoutes,
];

function routeAllowed(route: PortalRoute, granted: ReadonlySet<string>) {
  if (route.requiredPermission && !granted.has(route.requiredPermission)) {
    return false;
  }

  if (
    route.requiredAnyPermissions &&
    !route.requiredAnyPermissions.some((item) => granted.has(item))
  ) {
    return false;
  }

  return (
    !route.requiredAllCapabilities ||
    route.requiredAllCapabilities.every((item) => granted.has(item))
  );
}

export function filterPortalRoutes(
  routes: readonly PortalRoute[],
  space: PortalSpace,
  granted: ReadonlySet<string>,
): PortalRoute[] {
  return routes.flatMap((route) => {
    if (route.space !== space || !routeAllowed(route, granted)) {
      return [];
    }

    const children = route.children
      ? filterPortalRoutes(route.children, space, granted)
      : undefined;

    if (route.children?.length && children?.length === 0) {
      return [];
    }

    return [{ ...route, children }];
  });
}
