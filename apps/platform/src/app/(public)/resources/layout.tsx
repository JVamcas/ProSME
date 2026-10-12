import { PublicPageBoundary } from "@/modules/content/ui/public/PublicPageBoundary";

export default function ResourceCentreLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicPageBoundary pageKey="resources">
      {children}
    </PublicPageBoundary>
  );
}
