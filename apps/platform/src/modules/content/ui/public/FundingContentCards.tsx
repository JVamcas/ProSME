import {
  Banknote,
  Globe2,
  HeartHandshake,
  Lightbulb,
  Target,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  FundingCardContent,
  FundingIconKey,
} from "../../FundingPageContent";

const icons = {
  grant: Banknote,
  growth: Target,
  impact: Lightbulb,
  inclusive: Users,
  innovation: Lightbulb,
  market: Globe2,
  mentorship: HeartHandshake,
} satisfies Record<FundingIconKey, typeof Banknote>;

export function FundingContentCards({
  cards,
  variant,
}: {
  cards: FundingCardContent[];
  variant: "support" | "priorities";
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        variant === "support" ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {cards.map((card) => {
        const Icon = icons[card.icon];
        return (
          <article
            className="flex items-start gap-4 rounded-xl border border-brand-blue/25 bg-white p-5"
            key={card.title}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-orange/10 text-brand-orange">
              <Icon aria-hidden className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-brand-navy">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-brand-navy/65">
                {card.description}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
