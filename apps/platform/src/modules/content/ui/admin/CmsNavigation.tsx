import { getCurrentUser } from "@/auth/authorization/current-user";
import CmsSidebar from "./CmsSidebar";

export default async function CmsNavigation() {
  const user = await getCurrentUser();
  if (!user) return null;

  return <CmsSidebar displayName={user.displayName} email={user.email} />;
}
