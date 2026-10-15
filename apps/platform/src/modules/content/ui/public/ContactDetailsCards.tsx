import { Clock3, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
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
    <div className="flex min-w-0 items-start gap-5">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10">
        <Icon className="size-7 text-brand-orange" aria-hidden="true" />
      </div>
      <div className="min-w-0 pt-1">
        <h3 className="font-bold text-brand-navy">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ContactDetailsCards({ contact }: { contact: ContactContent }) {
  const phone = contact.phone?.trim();
  const officeHours = contact.officeHours?.trim();

  return (
    <div className="min-w-0 space-y-6">
      <ContactCard icon={Mail} title="Email">
        <a
          href={`mailto:${contact.email}`}
          className="mt-1 block text-base text-brand-navy wrap-break-word hover:underline focus-visible:underline"
        >
          {contact.email}
        </a>
      </ContactCard>
      {phone ? (
        <ContactCard icon={Phone} title="Telephone">
          <a
            href={`tel:${phone}`}
            className="mt-1 block text-base text-brand-navy wrap-break-word hover:underline focus-visible:underline"
          >
            {phone}
          </a>
        </ContactCard>
      ) : null}
      <ContactCard icon={MapPin} title="Programme office">
        <p className="mt-1 whitespace-pre-line text-base leading-6 text-brand-navy wrap-break-word">
          {contact.address}
        </p>
      </ContactCard>
      {officeHours ? (
        <ContactCard icon={Clock3} title="Office hours">
          <p className="mt-1 whitespace-pre-line text-base leading-6 text-brand-navy wrap-break-word">
            {officeHours}
          </p>
        </ContactCard>
      ) : null}
    </div>
  );
}
