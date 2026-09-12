import { BarChart3 } from "lucide-react";

import { getStatistics } from "@/modules/content/content.queries";

export async function HomeImpact() {
  const statistics = await getStatistics();
  return <section className="bg-navy py-14 text-white"><div className="container"><h2 className="text-3xl font-bold">Real businesses, lasting impact.</h2><p className="mt-2 text-white/70">Together, we’re building a more competitive Namibia that supports MSME growth.</p><div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">{statistics.map(({ value, label }) => <div key={label} className="rounded-xl border border-white/15 bg-white/5 p-5"><BarChart3 className="size-6 text-orange" /><strong className="mt-3 block text-2xl text-white">{value}</strong><span className="mt-1 block text-sm text-white/65">{label}</span></div>)}</div></div></section>;
}
