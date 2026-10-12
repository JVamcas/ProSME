import { PublicPageBoundary } from "@/modules/content/ui/public/PublicPageBoundary";

export default function EligibilityLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicPageBoundary pageKey="funding">
      {children}
    </PublicPageBoundary>
  );
}
