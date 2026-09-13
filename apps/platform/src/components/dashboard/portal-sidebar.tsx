import {
  Bell,
  FileCheck2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  UserRound,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "./logout-button";

const navigation = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: FileText, label: "My Applications" },
  { icon: FileCheck2, label: "My Documents" },
  { icon: MessageSquare, label: "Messages" },
  { icon: Bell, label: "Notifications" },
];

export function PortalSidebar({ name }: { name: string }) {
  return (
    <aside className="flex flex-col bg-navy p-6 text-white">
      <div className="border-b border-white/10 px-3 pb-5">
        <Logo href="/" inverted compact />
      </div>
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
        <span className="grid size-10 place-items-center rounded-full bg-orange font-bold text-navy">
          {name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="text-xs text-white/45">Applicant</p>
        </div>
      </div>
      <nav className="mt-6 grid gap-1 text-sm">
        {navigation.map(({ icon: Icon, label, active }) => (
          <span
            key={label}
            className={`flex items-center gap-3 px-4 py-3 ${active ? "rounded-xl bg-white/10 font-semibold" : "text-white/55"}`}
          >
            <Icon className="size-4 text-brand-orange" />
            {label}
          </span>
        ))}
      </nav>
      <div className="mt-auto grid gap-1 border-t border-white/10 pt-5">
        <span className="flex items-center gap-3 px-4 py-3 text-white/55">
          <UserRound className="size-4 text-brand-orange" />
          Profile
        </span>
        <span className="flex items-center gap-3 px-4 py-3 text-white/55">
          <HelpCircle className="size-4 text-brand-orange" />
          Help Center
        </span>
        <LogoutButton />
      </div>
    </aside>
  );
}
