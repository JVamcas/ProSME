import { PublicPageBoundary } from "@/modules/content/ui/public/PublicPageBoundary";

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicPageBoundary pageKey="about">
      {children}
    </PublicPageBoundary>
  );
}
