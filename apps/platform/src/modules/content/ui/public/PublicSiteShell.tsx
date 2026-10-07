import { SiteHeader } from "@/modules/content/ui/public/SiteHeader";
import { SiteFooter } from "@/modules/content/ui/public/SiteFooter";
import { cn } from "@/lib/utils";

export function PublicSiteShell({
  children,
  mainClassName,
}: {
  children: React.ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className="flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-clip">
      <SiteHeader />
      <main className={cn("min-w-0 flex-1", mainClassName)}>{children}</main>
      <SiteFooter />
    </div>
  );
}
