import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { ChatbotCaseWorkspace } from "@/modules/chatbot/ui/operations/ChatbotCaseWorkspace";

export const metadata: Metadata = { title: "Escalated reviews | Process Monitor" };

export default async function ChatbotSupportCasesPage() {
  const user = await getAuthenticatedPageUser();
  if (!can(user, permissionCodes.chatbotEscalationReadAll)) {
    redirect("/unauthorized");
  }
  return <ChatbotCaseWorkspace scope="all" />;
}
