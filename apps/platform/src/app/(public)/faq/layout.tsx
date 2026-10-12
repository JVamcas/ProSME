import { PublicPageBoundary } from "@/modules/content/ui/public/PublicPageBoundary";

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicPageBoundary pageKey="faq">
      {children}
    </PublicPageBoundary>
  );
}
