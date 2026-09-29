import { getCurrentUser } from "@/auth/authorization/current-user";
import { userInitials } from "@/lib/user-initials";
import { Logo } from "@/shared/ui/Logo";

export default async function CmsNavBrand() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="cms-nav-brand">
      <Logo className="cms-nav-brand__logo" href="/cms" compact />
      <div className="cms-nav-brand__identity">
        <span aria-hidden="true" className="cms-nav-brand__avatar">
          {userInitials(user.displayName) || "SF"}
        </span>
        <span className="cms-nav-brand__user">
          <strong>{user.displayName}</strong>
          <small>{user.email}</small>
        </span>
      </div>
    </div>
  );
}
