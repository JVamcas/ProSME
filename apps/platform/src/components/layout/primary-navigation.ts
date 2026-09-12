export type NavigationItem = {
  href: string;
  label: string;
};

export const primaryNavigation: readonly NavigationItem[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/funding", label: "Funding" },
  { href: "/eligibility", label: "Eligibility" },
  { href: "/how-to-apply", label: "How to Apply" },
  { href: "/news", label: "News" },
  { href: "/resources", label: "Resources" },
  { href: "/events", label: "Events" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];
