"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOutIcon,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApplicationStore } from "@/store/application-store";
import { Logo } from "../brand/logo";

const timeline = [
  { title: "Submitted", text: "Application received", done: true },
  { title: "Completeness check", text: "Currently in progress", active: true },
  { title: "Technical assessment", text: "Pending" },
  { title: "Finance review", text: "Pending" },
  { title: "Decision", text: "Pending" },
];

export function ApplicantDashboard() {
  const { application, documents, reference, submittedAt } =
    useApplicationStore();
  useEffect(() => {
    void useApplicationStore.persist.rehydrate();
  }, []);
  const hasApplication = Boolean(reference);
  const name = application.firstName
    ? `${application.firstName} ${application.lastName ?? ""}`
    : "Tomas Hangula";

  return (
    <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
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
          <span className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 font-semibold">
            <LayoutDashboard className="size-4 text-orange" />
            Dashboard
          </span>
          <span className="flex items-center gap-3 px-4 py-3 text-white/55">
            <FileText className="size-4" />
            My Applications
          </span>
          <span className="flex items-center gap-3 px-4 py-3 text-white/55">
            <FileCheck2 className="size-4" />
            My Documents
          </span>
          <span className="flex items-center gap-3 px-4 py-3 text-white/55">
            <MessageSquare className="size-4" />
            Messages
          </span>
          <span className="flex items-center gap-3 px-4 py-3 text-white/55">
            <Bell className="size-4" />
            Notifications
          </span>
        </nav>
        <div className="mt-auto grid gap-1 border-t border-white/10 pt-5">
          <span className="flex items-center gap-3 px-4 py-3 text-white/55">
            <UserRound className="size-4" />
            Profile
          </span>
          <span className="flex items-center gap-3 px-4 py-3 text-white/55">
            <HelpCircle className="size-4" />
            Help Center
          </span>
          <span className="flex items-center gap-3 px-4 py-3 text-white/55">
            <LogOutIcon className="size-4" />
            Logout
          </span>
        </div>
      </aside>
      <div className="min-w-0 bg-slate-100 p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-500">
              Welcome back, {application.firstName || "Applicant"}
            </p>
            <h1 className="display mt-1 text-3xl font-semibold text-navy">
              Application overview
            </h1>
          </div>
          <button className="relative grid size-10 place-items-center rounded-full border border-slate-200 bg-white">
            <Bell className="size-4 text-slate-600" />
            <span className="absolute right-0 top-0 size-2.5 rounded-full bg-gold" />
          </button>
        </div>
        {!hasApplication ? (
          <div className="card mt-8 p-10 text-center">
            <FileText className="mx-auto size-10 text-orange" />
            <h2 className="display mt-4 text-2xl font-semibold text-navy">
              No submitted application yet
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Start an application to see its progress here.
            </p>
            <Button asChild variant="gold" className="mt-6">
              <Link href="/apply">Start application</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="card p-5">
                <p className="text-xs text-slate-400">Active applications</p>
                <p className="mt-2 text-3xl font-extrabold text-navy">1</p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate-400">Current stage</p>
                <p className="mt-2 font-bold text-amber-700">
                  Completeness check
                </p>
              </div>
              <div className="card p-5">
                <p className="text-xs text-slate-400">Documents provided</p>
                <p className="mt-2 text-3xl font-extrabold text-navy">
                  {Object.keys(documents).length}
                  <span className="text-sm font-medium text-slate-400">
                    {" "}
                    / 8
                  </span>
                </p>
              </div>
            </div>
            <section className="card mt-6 overflow-hidden">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange">
                    {reference}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-navy">
                    {application.businessName}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Submitted{" "}
                    {submittedAt
                      ? new Intl.DateTimeFormat("en-NA", {
                          dateStyle: "medium",
                        }).format(new Date(submittedAt))
                      : "today"}{" "}
                    · N$
                    {Number(application.amountRequested ?? 0).toLocaleString(
                      "en-NA",
                    )}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                  In completeness check
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-bold text-navy">
                  Application progress
                </h3>
                <div className="mt-6 grid gap-0 md:grid-cols-5">
                  {timeline.map((item, i) => (
                    <div
                      key={item.title}
                      className="relative flex gap-4 pb-6 md:block md:pb-0"
                    >
                      <div
                        className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${item.done ? "border-emerald-600 bg-emerald-600 text-white" : item.active ? "border-orange bg-white text-navy" : "border-slate-200 bg-white text-slate-300"}`}
                      >
                        {item.done ? (
                          <Check className="size-4" />
                        ) : (
                          <span className="size-2 rounded-full bg-current" />
                        )}
                      </div>
                      {i < timeline.length - 1 && (
                        <span
                          className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 md:left-8 md:top-[15px] md:h-0.5 md:w-[calc(100%-2rem)] ${item.done ? "bg-emerald-400" : "bg-slate-200"}`}
                        />
                      )}
                      <div className="md:mt-3 md:pr-3">
                        <p className="text-xs font-bold text-slate-800">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <section className="card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-navy">Next action</h2>
                  <Clock3 className="size-4 text-orange" />
                </div>
                <div className="mt-4 flex gap-3 rounded-2xl bg-orange-pale p-4">
                  <Check className="mt-0.5 size-4 shrink-0 text-navy" />
                  <p className="text-xs leading-5 text-slate-600">
                    <strong className="block text-navy">
                      No action required
                    </strong>
                    The programme team is reviewing your application for
                    completeness.
                  </p>
                </div>
              </section>
              <section className="card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-navy">
                    Latest notification
                  </h2>
                  <AlertCircle className="size-4 text-gold-dark" />
                </div>
                <button className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-amber-50 p-4 text-left">
                  <span className="grid size-9 place-items-center rounded-full bg-white">
                    <Bell className="size-4 text-amber-700" />
                  </span>
                  <span className="flex-1 text-xs leading-5 text-slate-600">
                    <strong className="block text-navy">
                      Application received
                    </strong>
                    Your reference is {reference}
                  </span>
                  <ChevronRight className="size-4 text-slate-400" />
                </button>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
