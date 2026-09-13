"use client";

import { ChevronDown, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LogoutButton } from "@/components/layout/LogoutButton";
import { userInitials } from "@/lib/user-initials";
import type { PortalContext } from "@/modules/profiles/ProfileTypes";

export function PortalUserMenu({ context }: { context: PortalContext }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const canOpenProfile = context.availableSpaces.includes("applicant");

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeFromOutside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeFromKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
    };
  }, [open]);

  return (
    <div className="relative" ref={container}>
      <button
        ref={trigger}
        aria-controls="portal-user-menu"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-brand-navy hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-navy text-xs font-bold text-brand-white">
          {userInitials(context.displayName) || "SF"}
        </span>
        <span className="max-w-44 truncate text-sm font-bold">
          {context.displayName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 text-brand-orange transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          id="portal-user-menu"
          aria-label="Account options"
          className="absolute -right-8 top-[calc(100%+18px)] z-50 w-72 rounded-bl-2xl bg-brand-white p-4 shadow-xl"
        >
          <p className="truncate px-3 text-sm font-bold text-brand-navy">
            {context.displayName}
          </p>
          <p className="truncate px-3 pb-3 text-xs text-brand-navy/65">
            {context.email}
          </p>
          {canOpenProfile ? (
            <Link
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-brand-navy hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy"
              href="/portal/profile"
              onClick={() => setOpen(false)}
            >
              <UserRound
                aria-hidden="true"
                className="size-4 text-brand-orange"
              />
              My profile
            </Link>
          ) : null}
          <LogoutButton tone="brand" />
        </div>
      ) : null}
    </div>
  );
}
