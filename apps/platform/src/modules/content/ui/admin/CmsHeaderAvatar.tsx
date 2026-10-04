import { getCurrentUser } from "@/auth/authorization/current-user";
import { AppHeaderAvatar } from "@/shared/ui/navigation/AppHeader";

export default async function CmsHeaderAvatar() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return <AppHeaderAvatar displayName={user.displayName} />;
}
