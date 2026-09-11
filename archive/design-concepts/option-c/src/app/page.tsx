import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Globe2,
  GraduationCap,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const quickLinks = [
  {
    href: "/funding",
    icon: Banknote,
    title: "Funding calls",
    text: "View available support",
  },
  {
    href: "/eligibility",
    icon: CheckCircle2,
    title: "Eligibility checker",
    text: "See if your business qualifies",
  },
  {
    href: "/apply",
    icon: FileCheck2,
    title: "Apply now",
    text: "Start your application",
  },
  {
    href: "/how-to-apply",
    icon: BookOpen,
    title: "Application guide",
    text: "Prepare before you apply",
  },
];

const support = [
  {
    icon: Banknote,
    title: "Grant funding",
    text: "N$50,000 to N$100,000 for eligible business growth activities.",
  },
  {
    icon: GraduationCap,
    title: "Business support",
    text: "Capacity building, mentorship, coaching and technical guidance.",
  },
  {
    icon: Globe2,
    title: "Market linkages",
    text: "Support to prepare for expansion, exports and investment opportunities.",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#0A183B] text-white">
        {/* Soft ambient light */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(107,174,214,0.16),transparent_34%)]" />

        {/* Large brand accent */}
        <div className="absolute -right-32 -top-40 size-[520px] rounded-full border border-white/[0.05]" />
        <div className="absolute -right-10 -top-20 size-[360px] rounded-full border border-[#FFCA45]/10" />

        {/* Pattern */}
        <div
          className="
      brand-pattern
      absolute bottom-0 right-0
      hidden h-[62%] w-[44%]
      text-[#FFCA45]/[0.055]
      lg:block
    "
        />

        {/* Decorative network */}
        <Network
          className="
      absolute right-[9%] top-1/2
      hidden size-[300px]
      -translate-y-1/2
      text-[#6BAED6]/[0.12]
      xl:block
    "
          strokeWidth={0.55}
        />

        <div className="container relative z-10">
          <div className="grid min-h-[640px] items-center lg:grid-cols-[1.1fr_.9fr]">
            {/* Content */}
            <div className="max-w-3xl py-20 sm:py-24 lg:py-28">
              {/* Eyebrow */}
              <div className="mb-7 flex items-center gap-3">
                <span className="h-px w-9 bg-[#FFCA45]" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFCA45]">
                  SME Fund Programme
                </span>
              </div>

              {/* Heading */}
              <h1
                className="
            max-w-3xl
            text-5xl font-semibold
            leading-[1.03] tracking-[-0.04em]
            sm:text-6xl
            lg:text-[4.5rem]
          "
              >
                Empowering SMEs.
                <span className="mt-1 block text-[#F6F4E2]">
                  Building Namibia&apos;s future.
                </span>
              </h1>

              {/* Description */}
              <p className="mt-7 max-w-xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
                Accessible grant funding and tailored business support for
                Namibian enterprises ready to grow, innovate and create jobs.
              </p>

              {/* CTAs */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="
              h-12 rounded-md
              bg-[#FF6F00]
              px-6 text-white
              shadow-[0_8px_30px_rgba(255,111,0,0.18)]
              hover:bg-[#E96400]
            "
                >
                  <Link href="/funding">
                    Explore funding
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="
              h-12 rounded-md
              border-white/20
              bg-white/[0.04]
              px-6 text-white
              hover:bg-white/[0.08]
              hover:text-white
            "
                >
                  <Link href="/eligibility">Check eligibility</Link>
                </Button>
              </div>

              {/* Trust / programme points */}
              <div className="mt-12 grid max-w-2xl grid-cols-1 gap-5 border-t border-white/10 pt-6 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Namibian SMEs
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Supporting local enterprise
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Grant funding
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Growth-focused support
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Business support
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Beyond financial assistance
                  </p>
                </div>
              </div>
            </div>

            {/* Right visual space */}
            <div className="relative hidden h-full lg:block">
              <div
                className="
            absolute right-[6%] top-1/2
            w-[360px] -translate-y-1/2
            rounded-2xl
            border border-white/[0.08]
            bg-white/[0.035]
            p-8
            backdrop-blur-sm
          "
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6BAED6]">
                  SME Fund
                </p>

                <p className="mt-4 text-2xl font-medium leading-snug text-[#F6F4E2]">
                  Funding businesses that are ready to grow.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-[#FFCA45]" />
                    <span className="text-sm text-white/65">
                      Growth & expansion
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-[#6BAED6]" />
                    <span className="text-sm text-white/65">
                      Innovation support
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-[#16A34A]" />
                    <span className="text-sm text-white/65">
                      Enterprise development
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#FF6F00] via-[#FFCA45] to-[#6BAED6]" />
      </section>

      <section className="relative z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="container grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {[
            { icon: BriefcaseBusiness, n: "7", l: "Funding calls" },
            { icon: Users, n: "MSMEs", l: "Growth focused" },
            { icon: Banknote, n: "N$430k", l: "Initial fund allocation" },
            { icon: Globe2, n: "14", l: "Regions reached" },
          ].map(({ icon: Icon, n, l }) => (
            <div key={l} className="flex items-center gap-4 px-5 py-6">
              <Icon className="size-7 text-green" />
              <div>
                <strong className="block text-xl text-navy">{n}</strong>
                <span className="text-xs text-slate-500">{l}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream py-12">
        <div className="container">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-orange">
            Quick access
          </p>
          <h2 className="mt-2 text-2xl font-bold text-navy">
            What would you like to do?
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map(({ href, icon: Icon, title, text }) => (
              <Link
                href={href}
                key={title}
                className="group rounded-xl border border-navy/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-sky-pale text-navy">
                    <Icon className="size-5" />
                  </span>
                  <ArrowRight className="size-4 text-slate-300 transition group-hover:text-orange" />
                </div>
                <h3 className="mt-5 text-sm font-bold text-navy">{title}</h3>
                <p className="mt-1 text-xs text-slate-500">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-orange">
                Featured opportunity
              </p>
              <h2 className="display mt-3 text-4xl font-normal text-navy">
                SME Growth Grant
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                A competitive, merit-based funding opportunity for established
                Namibian MSMEs with a feasible business model and clear growth
                potential.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/funding">
                View details <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-[1.3fr_.7fr]">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid gap-6 bg-navy p-7 text-white sm:grid-cols-3">
                <div>
                  <p className="text-xs text-white/55">Grant amount</p>
                  <p className="mt-2 text-2xl font-bold text-yellow-300">
                    N$50k–100k
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/55">Business history</p>
                  <p className="mt-2 text-2xl font-bold">1+ year</p>
                </div>
                <div>
                  <p className="text-xs text-white/55">Ownership</p>
                  <p className="mt-2 text-2xl font-bold">51% Namibian</p>
                </div>
              </div>
              <div className="grid gap-4 p-7 sm:grid-cols-2">
                {[
                  "Youth and women-owned enterprises",
                  "Existing SMEs ready to expand",
                  "Enterprises in priority sectors",
                  "Businesses with job-creation potential",
                ].map((x) => (
                  <p key={x} className="flex gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="size-5 shrink-0 text-green" />
                    {x}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-sky/40 bg-sky-pale p-7">
              <CalendarDays className="size-7 text-navy" />
              <h3 className="mt-5 font-bold text-navy">
                Applications opening soon
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Check your eligibility and prepare the required documents before
                the first call opens.
              </p>
              <Button asChild variant="gold" className="mt-6 w-full">
                <Link href="/eligibility">Check eligibility</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section border-y border-slate-200 bg-cream">
        <div className="container">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-orange">
              Enterprise development
            </p>
            <h2 className="display mt-3 text-4xl font-normal text-navy">
              Financial and non-financial support
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {support.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-xl border border-navy/10 bg-white p-7 shadow-sm"
              >
                <Icon className="size-7 text-sky" />
                <h3 className="mt-5 font-bold text-navy">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy py-14 text-white">
        <div className="container flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <ShieldCheck className="mt-1 size-8 shrink-0 text-sky" />
            <div>
              <h2 className="text-2xl font-bold">
                Ready to find out if you qualify?
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Complete the initial check before starting an application.
              </p>
            </div>
          </div>
          <Button asChild variant="gold" size="lg">
            <Link href="/eligibility">
              Check eligibility <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
