import { chatbotPortalRoutes } from "./ChatbotPortalRoutes";
import { processMonitorPortalRoutes } from "./ProcessMonitorPortalRoutes";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardList,
  ListTodo,
  LayoutDashboard,
  Store,
  Settings,
  ShieldCheck,
  UsersRound,
  UserRound,
  Workflow,
  BadgeQuestionMark,
  Pipette,
  RotateCcw,
  ImageIcon,
} from "lucide-react";

import { permissionCodes } from "@/auth/authorization/permissions";
import type { NavigationSectionId } from "../navigation/NavigationSections";
import {
  operationsScopePermissions,
  type PortalSpace,
} from "@/auth/authorization/portal-access";

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
  section?: NavigationSectionId;
  children?: readonly PortalRoute[];
};

export const applicantPortalRoutes: readonly PortalRoute[] = [
  {
    id: "applicant-dashboard",
    section: "overview",
    href: "/portal",
    label: "Dashboard",
    icon: LayoutDashboard,
    space: "applicant",
  },
  {
    id: "funding-opportunities",
    section: "funding",
    href: "/portal/funding-opportunities",
    label: "Funding Opportunities",
    icon: BriefcaseBusiness,
    space: "applicant",
  },
  {
    id: "applicant-applications",
    section: "funding",
    href: "/portal/applications",
    label: "My applications",
    icon: ClipboardList,
    space: "applicant",
    requiredPermission: permissionCodes.fundingApplicationOwnRead,
  },
  {
    id: "applicant-businesses",
    section: "funding",
    href: "/portal/businesses",
    label: "My businesses",
    icon: Store,
    space: "applicant",
    requiredPermission: permissionCodes.businessOwnRead,
  },
  {
    id: "applicant-notifications",
    section: "account",
    href: "/portal/notifications",
    label: "Notifications",
    icon: Bell,
    space: "applicant",
    requiredPermission: permissionCodes.userNotificationOwnRead,
  },
  {
    id: "applicant-profile",
    section: "account",
    href: "/portal/profile",
    label: "My profile",
    icon: UserRound,
    space: "applicant",
    requiredAnyPermissions: [permissionCodes.userProfileOwnRead],
  },
];

export const operationsPortalRoutes: readonly PortalRoute[] = [
  {
    id: "admin-dashboard",
    section: "overview",
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    space: "operations",
    requiredAnyPermissions: operationsScopePermissions,
  },
  {
    id: "admin-work-queue",
    section: "queue",
    href: "/admin/work-queue",
    label: "Assigned tasks",
    icon: ListTodo,
    space: "operations",
    requiredPermission: permissionCodes.workflowTaskAssignedRead,
  },
  {
    id: "admin-conflict-reviews",
    section: "queue",
    href: "/admin/conflict-reviews",
    label: "Conflict reviews",
    icon: ShieldCheck,
    space: "operations",
    requiredPermission: permissionCodes.workflowCoiAllReview,
  },
  {
    id: "admin-my-escalated-cases",
    section: "queue",
    href: "/admin/my-queue/escalated-cases",
    label: "Escalated cases",
    icon: BadgeQuestionMark,
    space: "operations",
    requiredAnyPermissions: [
      permissionCodes.chatbotEscalationReadAssigned,
      permissionCodes.chatbotEscalationReadAll,
    ],
  },
  ...processMonitorPortalRoutes,
  {
    id: "website-analytics",
    href: "/admin/analytics/website",
    label: "Website analytics",
    icon: ChartNoAxesCombined,
    space: "operations",
    section: "analytics",
    requiredPermission: permissionCodes.reportingWebsiteReadAll,
  },
  {
    id: "admin-report-definitions",
    href: "/admin/reports/templates-definitions",
    label: "Settings",
    icon: Settings,
    space: "operations",
    section: "reporting",
    requiredAnyPermissions: [
      permissionCodes.reportingDatasetReadAll,
      permissionCodes.reportingTemplateReadAll,
    ],
  },
  {
    id: "admin-reports",
    href: "/admin/reports",
    label: "Reports",
    icon: Workflow,
    space: "operations",
    section: "reporting",
    requiredPermission: permissionCodes.reportingReportReadAll,
  },
  {
    id: "admin-funding-calls",
    section: "applications",
    href: "/admin/funding-calls",
    label: "Funding calls",
    icon: CircleDollarSign,
    space: "operations",
    requiredPermission: permissionCodes.fundingCallRead,
  },
  {
    id: "admin-applications",
    section: "applications",
    href: "/admin/applications",
    label: "Applications",
    icon: ClipboardList,
    space: "operations",
    requiredAnyPermissions: [
      permissionCodes.workflowTaskAssignedRead,
      permissionCodes.fundingApplicationAllRead,
    ],
  },
  ...chatbotPortalRoutes,
  {
    id: "admin-settings",
    section: "administration",
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
      permissionCodes.eligibilityRuleSetCreate,
      permissionCodes.eligibilityRuleSetPublish,
      permissionCodes.eligibilityRuleSetRead,
      permissionCodes.eligibilityRuleSetRetire,
      permissionCodes.eligibilityRuleSetUpdate,
      permissionCodes.notificationConfigurationRead,
      permissionCodes.notificationConfigurationUpdate,
      permissionCodes.notificationTemplateImport,
      permissionCodes.notificationTemplatePublish,
      permissionCodes.notificationDeliveryRead,
      permissionCodes.notificationDeliveryRetry,
      permissionCodes.brandingRead,
      permissionCodes.brandingManage,
    ],
    children: [
      {
        id: "admin-settings-branding",
        href: "/admin/settings/branding",
        label: "Branding",
        icon: ImageIcon,
        space: "operations",
        requiredAnyPermissions: [
          permissionCodes.brandingRead,
          permissionCodes.brandingManage,
        ],
      },
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
      {
        id: "admin-notification-channels",
        href: "/admin/notifications",
        label: "Notifications",
        icon: Bell,
        space: "operations",
        requiredAnyPermissions: [
          permissionCodes.notificationConfigurationRead,
          permissionCodes.notificationConfigurationUpdate,
          permissionCodes.notificationTemplateImport,
          permissionCodes.notificationTemplatePublish,
          permissionCodes.notificationDeliveryRead,
          permissionCodes.notificationDeliveryRetry,
        ],
        children: [
          {
            id: "admin-notification-channels",
            href: "/admin/notifications/channels",
            label: "Channels",
            icon: Pipette,
            space: "operations",
            requiredAnyPermissions: [
              permissionCodes.notificationConfigurationRead,
              permissionCodes.notificationTemplateImport,
              permissionCodes.notificationTemplatePublish,
            ],
          },
          {
            id: "admin-notification-event-rules",
            href: "/admin/notifications/event-rules",
            label: "Event Rules",
            icon: Workflow,
            space: "operations",
            requiredPermission: permissionCodes.notificationConfigurationRead,
          },
          {
            id: "admin-notification-deliveries",
            href: "/admin/notifications/deliveries",
            label: "Delivery Operations",
            icon: RotateCcw,
            space: "operations",
            requiredPermission: permissionCodes.notificationDeliveryRead,
          },
        ],
      },
      {
        id: "funding-call-eligibility",
        href: "/admin/settings/eligibility-rulesets",
        label: "Eligibility rulesets",
        icon: BadgeQuestionMark,
        space: "operations",
        requiredAnyPermissions: [
          permissionCodes.eligibilityRuleSetCreate,
          permissionCodes.eligibilityRuleSetPublish,
          permissionCodes.eligibilityRuleSetRead,
          permissionCodes.eligibilityRuleSetRetire,
          permissionCodes.eligibilityRuleSetUpdate,
        ],
      },
    ],
  },
  {
    id: "admin-users",
    section: "administration",
    href: "/admin/users",
    label: "Users & access",
    icon: UsersRound,
    space: "operations",
    requiredAnyPermissions: [
      permissionCodes.userRead,
      permissionCodes.userManage,
      permissionCodes.roleRead,
      permissionCodes.roleManage,
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
