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
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className={cn("flex-1", mainClassName)}>{children}</main>
      <SiteFooter />
    </div>
  );
}
