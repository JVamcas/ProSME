import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type Answer = "yes" | "no";

const answers = {
  yes: {
    detail: "This applies to my business",
    iconClassName: "bg-emerald-100 text-emerald-700",
    buttonClassName: "hover:border-emerald-500 hover:bg-emerald-50",
    Icon: Check,
  },
  no: {
    detail: "Not yet or not applicable",
    iconClassName: "bg-red-100 text-red-600",
    buttonClassName: "hover:border-red-400 hover:bg-red-50",
    Icon: X,
  },
} as const;

export function EligibilityAnswerButton({
  answer,
  onSelect,
}: {
  answer: Answer;
  onSelect: (answer: Answer) => void;
}) {
  const { buttonClassName, detail, iconClassName, Icon } = answers[answer];

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onSelect(answer)}
      className={`group h-auto justify-start rounded-2xl border-2 border-slate-200 p-5 text-left ${buttonClassName}`}
    >
      <span
        className={`grid size-10 place-items-center rounded-full ${iconClassName}`}
      >
        <Icon className="size-5" />
      </span>
      <span>
        <strong className="block text-navy">
          {answer === "yes" ? "Yes" : "No"}
        </strong>
        <span className="text-xs font-normal text-slate-500">{detail}</span>
      </span>
    </Button>
  );
}
