import { BadgeQuestionMark, Settings } from "lucide-react";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { PortalRoute } from "./portal-navigation";
export const chatbotPortalRoutes: readonly PortalRoute[] = [
  {
    id: "admin-chatbot-knowledge",
    section: "chatbot",
    href: "/admin/chatbot/knowledge",
    label: "Knowledge base",
    icon: BadgeQuestionMark,
    space: "operations",
    requiredPermission: permissionCodes.chatbotKnowledgeReadAll,
  },
  {
    id: "admin-chatbot-settings",
    section: "chatbot",
    href: "/admin/chatbot/settings",
    label: "Settings",
    icon: Settings,
    space: "operations",
    requiredPermission: permissionCodes.chatbotSettingsReadAll,
  },
];
