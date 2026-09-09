import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Coins,
  Leaf,
  MapPin,
  Settings,
  UsersRound,
  Venus,
} from "lucide-react";
import { FundingSectorsCarousel } from "@/components/home/funding-sectors-carousel";
import { FundingProcess } from "@/components/home/funding-process";

const audience = [
  { icon: UsersRound, title: "Youth-owned enterprises", text: "Backed by a new generation of Namibian talent." },
  { icon: Venus, title: "Women-owned enterprises", text: "Creating opportunities for women in business." },
  { icon: BarChart3, title: "Growing SMEs", text: "Existing businesses ready to expand." },
  { icon: Settings, title: "Priority sectors", text: "Enterprises in strategic and high-impact sectors." },
];

const impact = [
  { icon: UsersRound, title: "200+", text: "SMEs targeted" },
  { icon: BriefcaseBusiness, title: "Jobs", text: "More employment opportunities" },
  { icon: BarChart3, title: "Stronger businesses", text: "Increased competitiveness" },
  { icon: Leaf, title: "A more resilient economy", text: "For a prosperous Namibia" },
];

const news = [
  { image: "/brand/pic2.png", type: "News", date: "12 Apr 2025", title: "SME Fund launches new call for applications" },
  { image: "/brand/pic3.png", type: "Guide", date: "08 Apr 2025", title: "How to prepare a strong SME Fund application" },
  { image: "/brand/pic4.png", type: "Story", date: "02 Apr 2025", title: "From local idea to regional growth: A Namibian SME’s journey" },
];

export default function Home() {
  return (
    <>
      <section className="hero-stage relative overflow-hidden bg-[#f7f5ef]">
        <div className="hero-media absolute inset-y-0 right-0 hidden w-[52%] overflow-hidden lg:block">
          <Image
            src="/brand/pic1.png"
            alt="Namibian entrepreneur standing proudly in her business"
            fill
            priority
            sizes="50vw"
            className="hero-photo object-cover object-[52%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f5ef] via-[#f7f5ef]/20 to-transparent [background-size:55%_100%] bg-no-repeat" />
        </div>

        <div className="container relative grid min-h-[540px] items-center lg:grid-cols-[54%_46%]">
          <div className="hero-copy max-w-[680px] py-16 lg:pb-36 lg:pt-20">
            <p className="eyebrow text-[#44729b]">Supporting Namibian businesses</p>
            <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.04] tracking-[-.035em] text-navy sm:text-[3.5rem]">
              <span className="block lg:whitespace-nowrap">Catalysing SME Growth</span>
              <span className="block">and Economic</span>
              <span className="block">Transformation</span>
            </h1>
            <p className="mt-5 max-w-[590px] text-base leading-7 text-[#263c5a] sm:text-lg">
              Funding and business development support for Namibian enterprises ready to grow, innovate and create jobs.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/funding" className="hero-primary-cta inline-flex h-12 items-center gap-3 rounded-lg bg-[#efb538] px-7 text-sm font-bold text-navy shadow-sm transition hover:bg-[#e5a91f]">
                View Funding Opportunities <ArrowRight className="size-4" />
              </Link>
              <Link href="/eligibility" className="inline-flex h-12 items-center rounded-lg border border-navy bg-white/75 px-7 text-sm font-bold text-navy transition hover:bg-white">
                Check Eligibility
              </Link>
            </div>
          </div>

          <div className="relative min-h-[360px] lg:hidden">
            <Image src="/brand/pic1.png" alt="Namibian entrepreneur standing proudly in her business" fill priority sizes="(max-width: 1023px) calc(100vw - 2rem), 1px" className="hero-photo object-cover object-[58%_center]" />
          </div>

        </div>

        <div className="hero-badge isolate absolute right-[5.5%] top-[22%] z-10 hidden lg:block">
          <span aria-hidden="true" className="hero-badge-accent absolute -bottom-5 -right-5 z-0 size-[88px] rounded-br-[30px] bg-[#f2bd3e] shadow-md" />
          <div className="hero-badge-panel relative z-10 rounded-t-[28px] rounded-bl-sm rounded-br-[72px] bg-navy px-7 py-8 text-xl font-bold leading-[1.25] text-white shadow-xl">
            Bigger<br />Businesses.<br />A Stronger<br />Namibia
          </div>
        </div>

        <p className="absolute bottom-7 right-10 z-10 hidden text-right text-xs font-bold leading-5 text-white drop-shadow-md lg:block">Real Entrepreneurs.<br />Real Opportunities.</p>

        <div className="hero-stats z-20 bg-transparent lg:absolute lg:bottom-0 lg:left-0 lg:w-[54%]">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MapPin, value: "14", label: "Regions" },
              { icon: Coins, value: "N$ 50,000", label: "Minimum funding" },
              { icon: BarChart3, value: "N$ 100,000", label: "Maximum funding" },
              { icon: UsersRound, value: "200+", label: "SMEs targeted" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="hero-stat flex min-h-[88px] items-center justify-center gap-3 px-2 py-4 sm:px-4">
                <Icon className="size-7 shrink-0 text-[#0874b9]" strokeWidth={1.8} />
                <div><strong className="block whitespace-nowrap text-sm text-navy sm:text-base">{value}</strong><span className="whitespace-nowrap text-[10px] text-slate-500">{label}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-6">
        <div className="container grid min-h-[280px] overflow-hidden rounded-md border border-slate-50 bg-[#f8fafc]  md:grid-cols-[1fr_460px]">
          <div className="self-center p-7 sm:p-10">
            <span className="inline-flex rounded bg-[#f7d77b] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-navy">Current funding call</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-navy">SME Fund – Call for Applications</h2>
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">Applications are now open for qualifying Namibian SMEs. Don’t miss this opportunity to access grant funding and tailored business support.</p>
            <Link href="/funding" className="mt-4 inline-flex items-center gap-3 text-base font-bold text-[#0874b9]">View call details <ArrowRight className="size-5" /></Link>
          </div>
          <div className="m-6 flex flex-col justify-center rounded-lg bg-[#f7f3ea] p-9">
            <div className="flex items-center gap-5"><CalendarDays className="size-9 text-[#0874b9]" /><div><p className="text-sm text-slate-500">Application deadline</p><p className="text-lg font-bold text-navy">30 May 2025</p></div></div>
            <Link href="/apply" className="mt-7 inline-flex h-14 items-center justify-center gap-4 self-start rounded-lg bg-[#efb538] px-9 text-base font-bold text-navy">Apply Now <ArrowRight className="size-5" /></Link>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-28 bg-white py-9">
        <div className="container grid gap-8 lg:grid-cols-[450px_1fr] lg:items-center">
          <div>
            <p className="eyebrow text-[#3975a5]">Inclusive growth</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy">Who we support</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">We invest in Namibian entrepreneurs with the potential to create jobs, drive innovation and contribute to a more diversified and inclusive economy.</p>
            <Link href="/funding" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0874b9]">Learn more <ArrowRight className="size-4" /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {audience.map(({ icon: Icon, title, text }) => (
              <article key={title} className="flex min-h-[250px] flex-col items-center justify-center rounded-md border border-[#dbe3ea] bg-white px-5 py-7 text-center shadow-[0_2px_8px_rgba(15,45,75,.025)]">
                <Icon className="size-9 text-[#0878bd]" strokeWidth={1.65} />
                <h3 className="mt-6 max-w-[145px] text-sm font-bold leading-[1.3] text-navy">{title}</h3>
                <p className="mt-4 max-w-[165px] text-xs leading-[1.55] text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-12 pt-4">
        <div className="container grid gap-8 lg:grid-cols-[260px_1fr] lg:items-center">
          <div>
            <p className="eyebrow text-[#3975a5]">Key areas</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy">Funding sectors</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">We support businesses across key sectors that drive sustainable economic growth in Namibia.</p>
            <Link href="/funding" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0874b9]">View all sectors <ArrowRight className="size-4" /></Link>
          </div>
          <FundingSectorsCarousel />
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#e9f8ff] via-[#d9effb] to-[#eefaff] py-12">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow text-[#3975a5]">Simple and transparent</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-navy">How the funding works</h2><p className="mt-2 text-sm text-slate-600">A clear and fair process to get your business from application to support.</p></div>
            <Link href="/how-to-apply" className="inline-flex items-center gap-2 text-sm font-bold text-[#0874b9]">Learn more about the process <ArrowRight className="size-4" /></Link>
          </div>
          <FundingProcess />
        </div>
      </section>

      <section className="bg-white py-11">
        <div className="container grid gap-8 lg:grid-cols-[390px_1fr] lg:items-center">
          <div><p className="eyebrow text-[#3975a5]">Our impact</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-navy">Building a stronger Namibia</h2><p className="mt-3 text-sm leading-6 text-slate-600">By investing in SMEs, we are unlocking new opportunities, creating jobs and contributing to a more resilient and diversified economy.</p><Link href="/funding" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#0874b9]">Our impact <ArrowRight className="size-4" /></Link></div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {impact.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-slate-200 p-4 text-center">
                <Icon className={`size-9 ${index === 3 ? "text-[#168b49]" : "text-[#1678ba]"}`} strokeWidth={1.7} />
                <h3 className="mt-4 text-base font-bold leading-5 text-navy">{title}</h3><p className="mt-2 text-xs leading-4 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="resources" className="scroll-mt-28 bg-white pb-12 pt-3">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-[#3975a5]">Stay informed</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-navy">Latest news and resources</h2><p className="mt-2 text-sm text-slate-600">Updates, stories and useful materials for Namibian entrepreneurs.</p></div><Link href="#news" className="inline-flex items-center gap-2 text-sm font-bold text-[#0874b9]">View all news & resources <ArrowRight className="size-4" /></Link></div>
          <div id="news" className="mt-7 grid gap-5 md:grid-cols-3">
            {news.map((item) => (
              <article key={item.title} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-[16/7] overflow-hidden"><Image src={item.image} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-4 top-4 rounded bg-[#0874b9] px-2 py-1 text-[10px] font-bold uppercase text-white">{item.type}</span></div>
                <div className="p-5"><p className="text-[11px] text-slate-500">{item.date}</p><div className="mt-2 flex items-end justify-between gap-4"><h3 className="text-base font-bold leading-6 text-navy">{item.title}</h3><ArrowRight className="size-4 shrink-0 text-[#0874b9]" /></div></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="partners" className="border-t border-slate-100 bg-white py-10">
        <div className="container">
          <p className="eyebrow text-[#3975a5]">Our partners</p><h2 className="mt-3 text-lg font-bold text-navy">Working together for greater impact</h2>
          <div className="mt-8 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-4">
            <Image src="/brand/german-cooperation-namibia.jpg" alt="German Cooperation — Deutsche Zusammenarbeit" width={262} height={147} className="mx-auto h-20 w-auto max-w-full object-contain" />
            <Image src="/brand/giz-logo.svg" alt="Deutsche Gesellschaft für Internationale Zusammenarbeit (GIZ)" width={307} height={80} className="mx-auto h-16 w-auto max-w-full object-contain" />
            <div className="mx-auto flex items-center justify-center gap-3">
              <Image src="/brand/npc-logo.png" alt="Republic of Namibia coat of arms" width={100} height={100} className="h-16 w-16 object-contain" />
              <div className="text-left leading-tight">
                <p className="text-sm font-bold text-slate-800">Republic of Namibia</p>
                <p className="mt-1 text-xs text-slate-600">National Planning Commission</p>
              </div>
            </div>
            <Image src="/brand/nipdb-logo.png" alt="Namibia Investment Promotion and Development Board" width={1200} height={316} className="mx-auto h-auto w-56 max-w-full object-contain" />
          </div>
        </div>
      </section>
    </>
  );
}
