import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { FormEditorWorkspace } from "@/components/admin/forms/FormEditorWorkspace";

export const metadata: Metadata = { title: "Form editor" };

export default async function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.workflowFormRead)) {
    redirect("/unauthorized");
  }
  const { id } = await params;
  return (
    <FormEditorWorkspace
      canPublish={can(user, permissionCodes.workflowFormPublish)}
      canRetire={can(user, permissionCodes.workflowFormRetire)}
      canUpdate={can(user, permissionCodes.workflowFormUpdate)}
      id={id}
    />
  );
}
