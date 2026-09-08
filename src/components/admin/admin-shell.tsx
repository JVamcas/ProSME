"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: ClipboardList },
  { href: "/admin#projects", label: "Projects", icon: FileText },
  { href: "/admin#users", label: "Users", icon: Users },
  { href: "/admin#reports", label: "Reports", icon: FileText },
  { href: "/admin#documents", label: "Documents", icon: FileText },
];

function Navigation({ pathname }: { pathname: string }) {
  return (
    <nav className="grid gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin"
            ? pathname === "/admin"
            : href === "/admin/applications" &&
              pathname.startsWith("/admin/applications");
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-xs text-white/65 transition hover:bg-white/8 hover:text-white",
              active && "bg-white/12 font-bold text-white",
            )}
          >
            <Icon className={cn("size-4", active && "text-sky")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[224px_1fr]">
      <aside className="hidden min-h-screen bg-navy px-4 py-5 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-3 pb-5">
          <Logo href="/" inverted compact />
        </div>
        <div className="mt-6 flex items-center gap-3 border-y border-white/10 py-5">
          <span className="grid size-10 place-items-center rounded-full bg-sky font-bold text-navy">
            AU
          </span>
          <div>
            <p className="text-xs font-bold">Admin User</p>
            <p className="mt-0.5 text-[10px] text-white/40">Administrator</p>
          </div>
        </div>
        <div className="mt-5">
          <Navigation pathname={pathname} />
        </div>
        <div className="mt-auto grid gap-1 border-t border-white/10 pt-5">
          <Link
            href="#settings"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-xs text-white/60"
          >
            <Settings className="size-4" />
            Settings
          </Link>
          <Link
            href="#audit"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-xs text-white/60"
          >
            <ShieldCheck className="size-4" />
            Audit Log
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-xs text-white/60"
          >
            <LogOut className="size-4" />
            Logout
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <details className="relative">
            <summary className="grid size-9 list-none place-items-center rounded-lg border border-slate-200 [&::-webkit-details-marker]:hidden">
              <Menu className="size-4" />
            </summary>
            <div className="absolute left-0 top-11 z-50 w-64 rounded-xl bg-navy p-4 shadow-xl">
              <Navigation pathname={pathname} />
            </div>
          </details>
          <Logo href="/admin" compact />
          <span className="rounded-full bg-orange/10 px-2.5 py-1 text-[9px] font-bold uppercase text-orange">
            Prototype
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
