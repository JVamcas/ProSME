import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { ContactContent } from "../../ContentTypes";

function ContactCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-brand-blue/25 bg-brand-white p-5 shadow-[0_12px_35px_rgba(10,24,59,0.08)]">
      <Icon className="size-6 text-brand-orange" aria-hidden="true" />
      <h2 className="mt-3 font-bold text-brand-navy">{title}</h2>
      {children}
    </div>
  );
}

export function ContactDetailsCards({ contact }: { contact: ContactContent }) {
  const phone = contact.phone?.trim();
  const officeHours = contact.officeHours?.trim();

  return (
    <aside className="min-w-0 space-y-4">
      <ContactCard icon={Mail} title="Email">
        <a
          href={`mailto:${contact.email}`}
          className="mt-1 block text-sm font-semibold text-brand-navy underline wrap-break-word"
        >
          {contact.email}
        </a>
      </ContactCard>
      {phone ? (
        <ContactCard icon={Phone} title="Telephone">
          <a
            href={`tel:${phone}`}
            className="mt-1 block text-sm font-semibold text-brand-navy underline wrap-break-word"
          >
            {phone}
          </a>
        </ContactCard>
      ) : null}
      <ContactCard icon={MapPin} title="Programme office">
        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-brand-navy/75 wrap-break-word">
          {contact.address}
        </p>
        {officeHours ? (
          <p className="mt-2 text-xs text-brand-navy/65 wrap-break-word">
            {officeHours}
          </p>
        ) : null}
      </ContactCard>
    </aside>
  );
}
