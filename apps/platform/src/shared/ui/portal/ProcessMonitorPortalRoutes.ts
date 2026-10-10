import { BadgeQuestionMark, ListTodo, ShieldCheck } from "lucide-react";

import { permissionCodes } from "@/auth/authorization/permissions";
import type { PortalRoute } from "./portal-navigation";

export const processMonitorPortalRoutes: readonly PortalRoute[] = [
  {
    id: "monitor-assigned-tasks",
    section: "process-monitor",
    href: "/admin/process-monitor/assigned-tasks",
    label: "Assigned tasks",
    icon: ListTodo,
    space: "operations",
    requiredPermission: permissionCodes.workflowTaskAllRead,
  },
  {
    id: "monitor-conflict-reviews",
    section: "process-monitor",
    href: "/admin/process-monitor/conflict-reviews",
    label: "Conflict reviews",
    icon: ShieldCheck,
    space: "operations",
    requiredPermission: permissionCodes.workflowCoiAllReview,
  },
  {
    id: "monitor-escalated-reviews",
    section: "process-monitor",
    href: "/admin/chatbot/cases",
    label: "Escalated reviews",
    icon: BadgeQuestionMark,
    space: "operations",
    requiredPermission: permissionCodes.chatbotEscalationReadAll,
  },
];
