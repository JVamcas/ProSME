import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function AppShell({ children, mainClassName }: { children: React.ReactNode; mainClassName?: string }) {
  return <><SiteHeader /><main className={mainClassName}>{children}</main><SiteFooter /></>;
}
