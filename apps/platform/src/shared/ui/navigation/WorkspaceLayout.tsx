import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
import styles from "./WorkspaceLayout.module.css";

export function WorkspaceFrame({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(styles.frame, className)}
      data-workspace-layout
      style={style}
    >
      {children}
    </div>
  );
}

export function WorkspaceLayout({
  children,
  header,
  sidebar,
  sidebarWidth,
}: {
  children: ReactNode;
  header: ReactNode;
  sidebar: ReactNode;
  sidebarWidth: number;
}) {
  return (
    <WorkspaceFrame
      style={{ "--workspace-sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <section className={styles.section} aria-label="Workspace">
        <div
          className={styles.columns}
          data-workspace-slot="columns"
          style={{ gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr)` }}
        >
          <div className={styles.sidebar} data-workspace-slot="sidebar">
            {sidebar}
          </div>
          <div className={styles.content} data-workspace-slot="content">
            <div className={styles.header} data-workspace-slot="header">
              {header}
            </div>
            <main className="w-full p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </section>
    </WorkspaceFrame>
  );
}
