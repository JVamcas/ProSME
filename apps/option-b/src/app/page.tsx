import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Leaf,
  Send,
  Tag,
  Users,
  Venus,
} from "lucide-react";

const opportunities = [
  {
    image: "/brand/pic2.png",
    status: "OPEN NOW",
    title: "Green Business Growth Fund",
    text: "Support for SMEs investing in green solutions, clean energy and climate-resilient businesses.",
    amount: "NAD 250,000 – 2,000,000",
    date: "Closes 30 Apr 2025",
    audience: "All eligible SMEs",
  },
  {
    image: "/brand/pic3.png",
    status: "OPEN NOW",
    title: "Women in Business Fund",
    text: "Funding and support for women-owned SMEs to scale and create jobs.",
    amount: "NAD 100,000 – 1,000,000",
    date: "Closes 15 May 2025",
    audience: "Women-owned SMEs",
  },
  {
    image: "/brand/pic4.png",
    status: "COMING SOON",
    title: "SME Growth & Competitiveness Fund",
    text: "Support for growth-stage SMEs in priority sectors.",
    amount: "NAD 500,000 – 5,000,000",
    date: "Opens June 2025",
    audience: "Growth-stage SMEs",
  },
];

const supportGroups = [
  {
    icon: Users,
    title: "Youth-owned businesses",
    text: "Supporting young entrepreneurs to build a brighter future.",
    tone: "blue",
  },
  {
    icon: Venus,
    title: "Women-owned businesses",
    text: "Backing women-led enterprises to grow and create opportunities.",
    tone: "orange",
  },
  {
    icon: BarChart3,
    title: "Growth-stage SMEs",
    text: "Helping established SMEs scale, innovate and create jobs.",
    tone: "blue",
  },
  {
    icon: Leaf,
    title: "Businesses in priority sectors",
    text: "Including green economy, agro-processing, tourism, manufacturing and more.",
    tone: "green",
  },
];

const stories = [
  {
    image: "/brand/pic6.png",
    focal: "50% 8%",
    label: "SUCCESS STORY",
    title: "From idea to export: A Namibian maker’s journey",
    text: "How SME Fund support helped a local manufacturer scale beyond borders.",
    link: "Read story",
  },
  {
    image: "/brand/pic7.png",
    focal: "50% 10%",
    label: "BUSINESS TIPS",
    title: "5 ways to strengthen your funding application",
    text: "Practical tips to help you stand out and improve your chances.",
    link: "Read more",
  },
  {
    image: "/brand/pic8.png",
    focal: "50% 50%",
    label: "INSIGHTS",
    title: "Why green business is Namibia’s next big opportunity",
    text: "Exploring the role of SMEs in a more sustainable and resilient economy.",
    link: "Read more",
  },
];

export default function Home() {
  return (
    <>
    <section className="hero hero-animated relative overflow-hidden bg-white">
        <div className="absolute inset-0 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[64%]">
          <Image
            src="/brand/pic1.png"
            alt="Namibian entrepreneur in her shop"
            fill
            priority
            className="hero-main-photo object-cover object-[58%_top] lg:object-top"
            sizes="(max-width: 1023px) 100vw, 64vw"
          />
          <div
            className="absolute inset-0 lg:hidden"
            style={{
              background:
                "linear-gradient(to right, rgba(255,255,255,.92) 0%, rgba(255,255,255,.78) 52%, rgba(255,255,255,.48) 100%), linear-gradient(to bottom, rgba(255,255,255,.08) 0%, transparent 62%, rgba(255,255,255,.32) 100%)",
            }}
          />
          <div
            className="absolute inset-0 hidden lg:block"
            style={{
              background:
                "linear-gradient(to right, #fff 0%, rgba(255,255,255,.9) 12%, rgba(255,255,255,.35) 25%, transparent 42%)",
            }}
          />
          <div className="campaign-script hero-campaign absolute right-[4%] top-[9%] hidden w-[220px] rotate-[-6deg] text-right text-[clamp(1.8rem,2.15vw,2.45rem)] leading-[.88] tracking-[-.025em] text-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] lg:block">
            Bigger
            <br />
            Businesses
            <br />
            <span className="text-[#fff8e8]">
              Brighter
              <br />
              Namibia
            </span>
            <span className="ml-auto mt-2 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-[#f2a900]" />
          </div>
          <div className="hero-quote absolute bottom-[14%] right-[4%] hidden w-[250px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl lg:block">
            <p className="text-sm font-semibold leading-5 text-navy">
              “With the right support, small businesses do extraordinary
              things.”
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
              <span className="h-1 w-7 bg-gold" />
              Namibian Entrepreneur
            </div>
          </div>
        </div>
        <div className="absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-white via-white/95 to-white/65 lg:block" />
        <div className="hero-container relative z-10 grid min-h-[520px] items-center lg:grid-cols-[1.05fr_.95fr]">
          <div className="hero-copy max-w-[650px] py-14 lg:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-orange-dark">
              Funding today. A stronger tomorrow.
            </p>
            <h1 className="mt-4 text-[clamp(2.6rem,4vw,3.35rem)] font-bold leading-[1.04] tracking-[-.035em] text-navy">
              <span className="block">Your business has</span>
              <span className="block">
                potential. <span className="text-orange">We help you</span>
              </span>
              <span className="block text-orange">take the next step.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-7 text-[#294768]">
              Funding and business development support for Namibian SMEs ready
              to grow.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/funding" className="home-primary">
                Find Funding <ArrowRight className="size-4" />
              </Link>
              <Link href="/eligibility" className="home-secondary">
                Check My Eligibility
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-xs font-medium text-[#365b82]">
              <span className="flex items-center gap-2">
                <BarChart3 className="size-5 text-orange" />
                Access funding
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-5 text-orange" />
                Build your capacity
              </span>
              <span className="flex items-center gap-2">
                <Leaf className="size-5 text-orange" />
                Create opportunities
              </span>
            </div>
          </div>
          <div className="hidden lg:block" />
        </div>
      </section>

      <section className="container relative z-20 grid gap-3 py-5 md:grid-cols-3">
        {[
          {
            href: "/funding",
            icon: CircleDollarSign,
            title: "I want funding",
            text: "Explore current opportunities and find the right funding for your business.",
            bg: "bg-[#fff3e8]",
            color: "bg-orange",
          },
          {
            href: "/eligibility",
            icon: FileText,
            title: "Am I eligible?",
            text: "Check if your business meets the key criteria before you apply.",
            bg: "bg-[#f6f4e2]",
            color: "bg-[#ffca45]",
          },
          {
            href: "/dashboard",
            icon: CalendarDays,
            title: "I already applied",
            text: "Track your application and stay updated on the next steps.",
            bg: "bg-[#fff8f2]",
            color: "bg-orange",
          },
        ].map(({ href, icon: Icon, title, text, bg, color }) => (
          <Link
            href={href}
            key={title}
            className={`${bg} group flex min-h-40 items-center gap-5 rounded-xl border border-white p-5 transition duration-500 hover:-translate-y-1 hover:shadow-lg`}
          >
            <div className="flex-1">
              <span
                className={`${color} grid size-12 place-items-center rounded-full text-white shadow-sm`}
              >
                <Icon className="size-6" />
              </span>
              <h2 className="mt-4 text-2xl font-bold text-navy">{title}</h2>
              <p className="mt-2 max-w-[270px] text-sm leading-5 text-[#365b82]">
                {text}
              </p>
            </div>
            <span
              className={`${color} grid size-9 shrink-0 place-items-center rounded-full text-white`}
            >
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>

      <section className="container pb-12">
        <SectionHeading
          title="Current funding opportunities"
          text="Explore our latest funding opportunities designed to support Namibian SMEs across key sectors."
          link="View all opportunities"
        />
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {opportunities.map((item) => (
            <OpportunityCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="container pb-14">
        <SectionHeading
          title="How it works"
          text="A simple, transparent process to get you from application to support."
        />
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: FileText,
              title: "Check eligibility",
              text: "See if your business meets the key criteria.",
            },
            {
              icon: FileText,
              title: "Prepare your business",
              text: "Get your documents ready and strengthen your application.",
            },
            {
              icon: Send,
              title: "Apply online",
              text: "Submit your application through our secure portal.",
            },
            {
              icon: BarChart3,
              title: "Track your application",
              text: "Stay updated on your progress every step of the way.",
            },
          ].map(({ icon: Icon, title, text }, index) => (
            <div key={title} className="relative text-center">
              {index < 3 && (
                <span className="absolute left-[72%] top-9 hidden w-[56%] border-t-2 border-dotted border-[#ffca45] lg:block" />
              )}
              <span
                className={`absolute left-3 top-3 z-10 grid size-8 place-items-center rounded-full text-sm font-bold ${index % 2 ? "bg-[#ffca45] text-navy" : "bg-orange text-white"}`}
              >
                {index + 1}
              </span>
              <span className="mx-auto grid size-[84px] place-items-center rounded-full bg-orange-pale text-orange-dark">
                <Icon className="size-9" strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-navy">{title}</h3>
              <p className="mx-auto mt-2 max-w-[220px] text-sm leading-5 text-[#486786]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#eee8dd] bg-[#fffcf7] py-10">
        <div className="container">
          <SectionHeading
            title="Who we support"
            text="We invest in Namibian SMEs with high potential, inclusive impact and a commitment to growth."
          />
        </div>
        <div className="support-marquee mt-6 overflow-hidden py-5">
          <div className="support-track">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="support-group"
                aria-hidden={copy === 1}
              >
                {supportGroups.map(({ icon: Icon, title, text, tone }) => {
                  const accent =
                    tone === "orange"
                      ? "bg-[#f4763a]"
                      : tone === "green"
                        ? "bg-[#5e963d]"
                        : "bg-orange";
                  return (
                    <article
                      key={`${copy}-${title}`}
                      className="support-card rounded-xl border border-slate-100 bg-white p-4"
                    >
                      <span
                        className={`${accent} grid size-12 place-items-center rounded-full text-white`}
                      >
                        <Icon className="size-6" />
                      </span>
                      <h3 className="mt-4 min-h-12 text-xl font-bold leading-6 text-navy">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-5 text-[#486786]">
                        {text}
                      </p>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-8">
        <Image
          src="/brand/pic5.png"
          alt="Namibian landscape"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.94)_0%,rgba(255,255,255,.78)_42%,rgba(255,255,255,.12)_82%)]" />
        <div className="hero-container relative z-10">
          <h2 className="text-3xl font-bold text-navy">
            Real businesses. Lasting impact.
          </h2>
          <p className="mt-1 text-sm text-[#365b82]">
            Together, we’re building a more inclusive and competitive Namibia.
          </p>
          <div className="mt-7 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { icon: Users, value: "300+", label: "Enterprises supported" },
              { icon: FileText, value: "7", label: "Funding calls" },
              {
                icon: BriefcaseBusiness,
                value: "1,200+",
                label: "Jobs enabled",
              },
              {
                icon: Leaf,
                value: "Stronger SMEs",
                label: "More inclusive growth",
              },
            ].map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="border-r border-[#ffc08f] last:border-0"
              >
                <Icon className="size-7 text-orange" />
                <strong className="mt-2 block text-2xl text-navy">
                  {value}
                </strong>
                <span className="text-xs text-[#365b82]">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="campaign-script absolute right-[4%] top-1/2 hidden w-[230px] -translate-y-1/2 rotate-[-6deg] text-right text-[clamp(1.65rem,2vw,2.35rem)] leading-[.98] text-white [text-shadow:0_2px_5px_rgba(0,0,0,.55)] lg:block">
          Small
          <br />
          Businesses.
          <br />A Brighter
          <br />
          Namibia
          <span className="ml-auto mt-2 block h-1.5 w-28 rotate-[-4deg] rounded-full bg-[#f2a900]" />
        </div>
      </section>

      <section className="container py-10">
        <SectionHeading
          title="Success stories & insights"
          text="Real stories. Practical resources. Useful insights for your business journey."
          link="View all stories and resources"
        />
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {stories.map((story) => (
            <article
              key={story.title}
              className="story-card flex min-h-[390px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white translation duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="story-image relative shrink-0 overflow-hidden">
                <Image
                  src={story.image}
                  alt={story.title}
                  fill
                  className="object-cover"
                  style={{ objectPosition: story.focal }}
                  sizes="(min-width: 768px) 33vw, 100vw"
                />

                <span className="absolute left-4 top-4 rounded bg-white/90 px-3 py-1 text-[10px] font-bold text-navy">
                  {story.label}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold leading-5 text-navy">
                  {story.title}
                </h3>

                <p className="mt-2 text-sm leading-5 text-[#486786]">
                  {story.text}
                </p>

                <Link
                  href="/funding"
                  className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-orange-dark"
                >
                  {story.link}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  title,
  text,
  link,
}: {
  title: string;
  text: string;
  link?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-navy">{title}</h2>
        <p className="mt-1 text-sm text-[#486786]">{text}</p>
      </div>
      {link && (
        <Link
          href="/funding"
          className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-orange-dark"
        >
          {link}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function OpportunityCard(item: (typeof opportunities)[number]) {
  return (
    <article className="funding-card flex h-[440px] flex-col overflow-hidden rounded-lg border border-slate-100 bg-white ">
      <div className="relative h-[250px] shrink-0 overflow-hidden">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 33vw, 100vw"
        />

        <span
          className={`absolute left-4 top-3 rounded px-3 py-1 text-[10px] font-bold ${
            item.status === "OPEN NOW"
              ? "bg-[#ffca45] text-navy"
              : "bg-white text-orange-dark"
          }`}
        >
          {item.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-navy">{item.title}</h3>

        <p className="mt-1 text-sm leading-5 text-[#486786]">{item.text}</p>

        <div className="mt-4 space-y-2 text-xs text-[#486786]">
          <p className="flex gap-2">
            <CircleDollarSign className="size-4 shrink-0 text-navy" />
            {item.amount}
          </p>

          <p className="flex gap-2">
            <CalendarDays className="size-4 shrink-0 text-navy" />
            {item.date}
          </p>

          <p className="flex gap-2">
            <Tag className="size-4 shrink-0 text-navy" />
            {item.audience}
          </p>
        </div>

        <Link
          href="/funding"
          className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-orange-dark"
        >
          Learn more <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
