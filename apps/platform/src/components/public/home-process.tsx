import { BarChart3, FileText, Send } from "lucide-react";

const steps = [
  { icon: FileText, title: "Check eligibility", text: "See if your business meets the key criteria." },
  { icon: FileText, title: "Prepare your business", text: "Get your documents ready and strengthen your application." },
  { icon: Send, title: "Apply online", text: "Submit your application through our secure portal." },
  { icon: BarChart3, title: "Track your application", text: "Stay updated on your progress every step of the way." },
];

export function HomeProcess() {
  return (
    <section className="container pb-14">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-brand-navy">How it works</h2>
        <p className="mt-1 text-sm text-brand-navy/70">A simple, transparent process to get you from application to support.</p>
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="relative text-center">
            {index < 3 ? <span className="absolute left-[72%] top-9 hidden w-[56%] border-t-2 border-dotted border-brand-yellow lg:block" /> : null}
            <span className={`absolute left-3 top-3 z-10 grid size-8 place-items-center rounded-full text-sm font-bold ${index % 2 ? "bg-brand-yellow text-brand-navy" : "bg-brand-orange text-brand-white"}`}>{index + 1}</span>
            <span className="mx-auto grid size-[84px] place-items-center rounded-full bg-brand-orange/10 text-brand-orange"><Icon className="size-9" strokeWidth={1.8} /></span>
            <h3 className="mt-5 text-lg font-bold text-brand-navy">{title}</h3>
            <p className="mx-auto mt-2 max-w-[220px] text-sm leading-5 text-brand-navy/70">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
