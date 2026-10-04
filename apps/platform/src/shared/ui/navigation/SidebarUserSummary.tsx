import { cn } from "@/lib/utils";
import { userInitials } from "@/lib/user-initials";
import styles from "./NavigationSidebar.module.css";

export function SidebarUserSummary({
  collapsed = false,
  dark = false,
  displayName,
  email,
}: {
  collapsed?: boolean;
  dark?: boolean;
  displayName: string;
  email: string;
}) {
  return (
    <div
      className={cn(
        styles.identity,
        dark ? styles.dark : styles.brand,
        collapsed && styles.identityCollapsed,
      )}
      title={collapsed ? `${displayName} (${email})` : undefined}
    >
      <span className={styles.avatar}>{userInitials(displayName) || "SF"}</span>
      <div className={collapsed ? styles.hiddenLabel : styles.user}>
        <p className={styles.name}>{displayName}</p>
        <p className={styles.email}>{email}</p>
      </div>
    </div>
  );
}
