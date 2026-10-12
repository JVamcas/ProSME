import { PublicPageBoundary } from "@/modules/content/ui/public/PublicPageBoundary";

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicPageBoundary pageKey="news">
      {children}
    </PublicPageBoundary>
  );
}
