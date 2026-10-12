import { PublicPageBoundary } from "@/modules/content/ui/public/PublicPageBoundary";

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicPageBoundary pageKey="events">
      {children}
    </PublicPageBoundary>
  );
}
