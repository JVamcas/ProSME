import Link from "next/link";
import { Bell, ChevronRight, FileWarning, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

const recentApplications = [
  ["APP-2024-0015", "Green Hydrogen Project", "30 May 2024", "In Review"],
  ["APP-2024-0014", "Agri Processing Plant", "29 May 2024", "In Review"],
  ["APP-2024-0013", "Wind Farm Development", "28 May 2024", "Submitted"],
  ["APP-2024-0012", "Solar Power Project", "12 May 2024", "In Review"],
];

const alerts = [
  { icon: Bell, text: "3 applications require attention" },
  { icon: FileWarning, text: "2 documents expiring soon" },
  { icon: RefreshCw, text: "1 system update available" },
];

export function AdminDashboardPanels() {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_.75fr]">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-navy">Recent Applications</h2>
          <Link
            href="/admin/applications"
            className="text-[10px] font-bold text-orange"
          >
            View All
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentApplications.map(([id, project, date, status]) => (
            <div
              key={id}
              className="grid grid-cols-[1fr_1.5fr_1fr_.7fr] gap-3 px-5 py-4 text-[10px] text-slate-500"
            >
              <span>{id}</span>
              <strong className="font-semibold text-slate-700">{project}</strong>
              <span>{date}</span>
              <span>{status}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-navy">System Alerts</h2>
        </div>
        <div className="grid gap-5 p-5">
          {alerts.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 text-xs text-slate-600"
            >
              <Icon className="size-5 shrink-0 text-navy" />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end px-5 pb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-[10px] text-orange"
          >
            View All
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </section>
    </div>
  );
}
