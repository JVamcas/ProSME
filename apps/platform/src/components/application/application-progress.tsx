import { Building2, Check, FileText, HandCoins, Paperclip, UserRound } from "lucide-react";

const steps = [
  { title: "Applicant", icon: UserRound },
  { title: "Business", icon: Building2 },
  { title: "Funding", icon: HandCoins },
  { title: "Documents", icon: Paperclip },
  { title: "Review", icon: FileText },
];

export const applicationStepTitles = [
  "Tell us about yourself",
  "Tell us about the business",
  "Your funding request",
  "Supporting documents",
  "Review and declare",
];

export function ApplicationProgress({ current }: { current: number }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-8">
      <div className="flex items-center justify-between gap-5 overflow-x-auto">
        {steps.map(({ title, icon: Icon }, index) => (
          <div key={title} className={`flex min-w-fit items-center gap-2 text-xs font-bold ${index === current ? "text-navy" : index < current ? "text-emerald-700" : "text-slate-400"}`}>
            <span className={`grid size-8 place-items-center rounded-full ${index === current ? "bg-navy text-white" : index < current ? "bg-emerald-100" : "border border-slate-200 bg-white"}`}>
              {index < current ? <Check className="size-4" /> : <Icon className="size-4" />}
            </span>
            <span className="hidden sm:block">{title}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-orange transition-all" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
      </div>
    </div>
  );
}

export const applicationStepCount = steps.length;
