import { PublicPageBoundary } from "@/modules/content/ui/public/PublicPageBoundary";

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicPageBoundary pageKey="contact">
      {children}
    </PublicPageBoundary>
  );
}
