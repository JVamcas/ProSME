import { BarChart3, FileText, Send } from "lucide-react";

import { SectionHeading } from "./section-heading";

const steps = [
  { icon: FileText, title: "Check eligibility", text: "See if your business meets the key criteria." },
  { icon: FileText, title: "Prepare your business", text: "Get your documents ready and strengthen your application." },
  { icon: Send, title: "Apply online", text: "Submit your application through our secure portal." },
  { icon: BarChart3, title: "Track your application", text: "Stay updated on your progress every step of the way." },
];

export function HomeProcess() {
  return (
    <section className="container pb-14">
      <SectionHeading title="How it works" text="A simple, transparent process to get you from application to support." />
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="relative text-center">
            {index < 3 ? <span className="absolute left-[72%] top-9 hidden w-[56%] border-t-2 border-dotted border-[#ffca45] lg:block" /> : null}
            <span className={`absolute left-3 top-3 z-10 grid size-8 place-items-center rounded-full text-sm font-bold ${index % 2 ? "bg-[#ffca45] text-navy" : "bg-orange text-white"}`}>{index + 1}</span>
            <span className="mx-auto grid size-[84px] place-items-center rounded-full bg-orange-pale text-orange-dark"><Icon className="size-9" strokeWidth={1.8} /></span>
            <h3 className="mt-5 text-lg font-bold text-navy">{title}</h3>
            <p className="mx-auto mt-2 max-w-[220px] text-sm leading-5 text-[#486786]">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
