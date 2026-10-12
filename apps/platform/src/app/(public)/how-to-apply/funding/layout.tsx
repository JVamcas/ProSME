import { PublicPageBoundary } from "@/modules/content/ui/public/PublicPageBoundary";

export default function FundingCallsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicPageBoundary pageKey="funding">
      {children}
    </PublicPageBoundary>
  );
}
