import { ArrowRight, CalendarDays, CircleDollarSign, FileText } from "lucide-react";
import Link from "next/link";

const actions = [
  { href: "/funding", icon: CircleDollarSign, title: "I want funding", text: "Explore current opportunities and find the right funding for your business.", background: "bg-[#fff3e8]", accent: "bg-orange" },
  { href: "/eligibility", icon: FileText, title: "Am I eligible?", text: "Check if your business meets the key criteria before you apply.", background: "bg-[#f6f4e2]", accent: "bg-[#ffca45]" },
  { href: "/portal", icon: CalendarDays, title: "I already applied", text: "Track your application and stay updated on the next steps.", background: "bg-[#fff8f2]", accent: "bg-orange" },
];

export function HomeActions() {
  return (
    <section className="container relative z-20 grid gap-3 py-5 md:grid-cols-3">
      {actions.map(({ href, icon: Icon, title, text, background, accent }) => (
        <Link href={href} key={title} className={`${background} group flex min-h-40 items-center gap-5 rounded-xl border border-white p-5 transition duration-500 hover:-translate-y-1 hover:shadow-lg`}>
          <div className="flex-1">
            <span className={`${accent} grid size-12 place-items-center rounded-full text-white shadow-sm`}><Icon className="size-6" /></span>
            <h2 className="mt-4 text-2xl font-bold text-navy">{title}</h2>
            <p className="mt-2 max-w-[270px] text-sm leading-5 text-[#365b82]">{text}</p>
          </div>
          <span className={`${accent} grid size-9 shrink-0 place-items-center rounded-full text-white`}><ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
        </Link>
      ))}
    </section>
  );
}
