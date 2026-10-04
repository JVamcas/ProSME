import { cn } from "@/lib/utils";
import styles from "./NavigationSidebar.module.css";

export function sidebarItemClassName({
  active = false,
  collapsed = false,
  dark = false,
  nested = false,
}: {
  active?: boolean;
  collapsed?: boolean;
  dark?: boolean;
  nested?: boolean;
} = {}) {
  return cn(
    styles.item,
    dark ? styles.dark : styles.brand,
    active && styles.active,
    collapsed && styles.iconOnly,
    nested && styles.nested,
  );
}

export const sidebarIconClassName = styles.icon;
export const sidebarLabelClassName = styles.label;
export const sidebarHiddenLabelClassName = styles.hiddenLabel;
export const sidebarLogoutClassName = styles.logout;
