import Link from "next/link";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { canAccessOperationsPortal } from "@/auth/authorization/portal-access";

export default async function CmsNavigationLinks() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="cms-navigation-links">
      <p className="cms-navigation-links__label">Workspace</p>
      <Link className="cms-navigation-links__link" href="/cms">
        Content management
      </Link>
      {canAccessOperationsPortal(user) ? (
        <Link className="cms-navigation-links__link" href="/admin">
          Back to operations
        </Link>
      ) : null}
      <a className="cms-navigation-links__link" href="/" target="_blank" rel="noreferrer">
        View public website
        <span className="cms-navigation-links__sr-only"> (opens in a new tab)</span>
      </a>
      <p className="cms-navigation-links__label cms-navigation-links__label--content">
        Content sections
      </p>
    </div>
  );
}
