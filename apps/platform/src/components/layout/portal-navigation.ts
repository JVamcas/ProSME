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
  requiredCapability?: string;
  requiredAnyCapabilities?: readonly string[];
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
    requiredCapability: capabilities.businessReadOwn,
  },
  {
    id: "applicant-applications",
    href: "/portal/applications",
    label: "My applications",
    icon: ClipboardList,
    space: "applicant",
    requiredCapability: capabilities.applicationReadOwn,
  },
  {
    id: "applicant-notifications",
    href: "/portal/notifications",
    label: "Notifications",
    icon: Bell,
    space: "applicant",
    requiredCapability: capabilities.notificationReadOwn,
  },
  {
    id: "applicant-profile",
    href: "/portal/profile",
    label: "My profile",
    icon: UserRound,
    space: "applicant",
    requiredAnyCapabilities: [
      capabilities.profileReadOwn,
    ],
  },
];

export const operationsPortalRoutes: readonly PortalRoute[] = [
  {
    id: "admin-dashboard",
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    space: "operations",
    requiredCapability: capabilities.adminAccess,
  },
  {
    id: "admin-work-queue",
    href: "/admin/work-queue",
    label: "My Work Queue",
    icon: ListTodo,
    space: "operations",
    requiredCapability: capabilities.workQueueRead,
  },
  {
    id: "admin-applications",
    href: "/admin/applications",
    label: "Applications",
    icon: ClipboardList,
    space: "operations",
    requiredAnyCapabilities: [
      capabilities.applicationReadAssigned,
      capabilities.applicationReadAll,
    ],
  },
  {
    id: "admin-workflows",
    href: "/admin/workflows",
    label: "Workflow Templates",
    icon: Workflow,
    space: "operations",
    requiredAnyCapabilities: [
      permissionCodes.workflowDefinitionRead,
      permissionCodes.workflowDefinitionCreate,
      permissionCodes.workflowDefinitionUpdate,
      permissionCodes.workflowDefinitionPublish,
      permissionCodes.workflowDefinitionRetire,
    ],
  },
  {
    id: "admin-cms",
    href: "/cms",
    label: "Content management",
    icon: FileText,
    space: "operations",
    requiredCapability: capabilities.cmsAccess,
  },
  {
    id: "admin-settings",
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    space: "operations",
    requiredAnyCapabilities: [
      permissionCodes.workflowFormRead,
      permissionCodes.workflowFormCreate,
      permissionCodes.workflowFormUpdate,
      permissionCodes.workflowFormPublish,
      permissionCodes.workflowFormRetire,
    ],
    children: [
      {
        id: "admin-settings-forms",
        href: "/admin/settings/forms",
        label: "Forms",
        icon: ClipboardList,
        space: "operations",
        requiredAnyCapabilities: [
          permissionCodes.workflowFormRead,
          permissionCodes.workflowFormCreate,
          permissionCodes.workflowFormUpdate,
          permissionCodes.workflowFormPublish,
          permissionCodes.workflowFormRetire,
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
    requiredAnyCapabilities: [
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
  if (route.requiredCapability && !granted.has(route.requiredCapability)) {
    return false;
  }

  if (
    route.requiredAnyCapabilities &&
    !route.requiredAnyCapabilities.some((item) => granted.has(item))
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
