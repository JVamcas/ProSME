import type { ReactNode } from "react";

import { userInitials } from "@/lib/user-initials";
import styles from "./AppHeader.module.css";

export function AppHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <header className={`${styles.header} ${className}`}>{children}</header>;
}

export function AppHeaderLabel({ children }: { children: ReactNode }) {
  return (
    <span className={styles.label} data-app-header-label>
      {children}
    </span>
  );
}

export function AppHeaderAvatar({ displayName }: { displayName: string }) {
  return (
    <span className={styles.avatar}>
      {userInitials(displayName) || "SF"}
    </span>
  );
}
