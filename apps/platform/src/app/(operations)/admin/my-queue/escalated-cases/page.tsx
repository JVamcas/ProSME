import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { ChatbotCaseWorkspace } from "@/modules/chatbot/ui/operations/ChatbotCaseWorkspace";

export const metadata: Metadata = { title: "Escalated cases | My Queue" };

export default async function MyEscalatedCasesPage() {
  const user = await getAuthenticatedPageUser();
  if (
    !can(user, permissionCodes.chatbotEscalationReadAssigned) &&
    !can(user, permissionCodes.chatbotEscalationReadAll)
  ) {
    redirect("/unauthorized");
  }
  return <ChatbotCaseWorkspace scope="assigned" />;
}
