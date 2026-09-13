"use client";

import { Menu } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import type { PortalSpace } from "@/auth/authorization/portal-access";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/dashboard/logout-button";
import type { PortalContext } from "@/modules/profiles/profile.types";
import { PortalNavList } from "./portal-nav-list";
import {
  filterPortalRoutes,
  portalRoutes,
  type PortalRoute,
} from "./portal-navigation";
import { PortalHelpLink, PortalUserSummary } from "./portal-shell-support";
import { PortalSpaceSwitcher } from "./portal-space-switcher";

function useDismissableMenu() {
  const menu = useRef<HTMLDetailsElement>(null);
  const closeMenu = useCallback(() => {
    if (menu.current) {
      menu.current.open = false;
    }
  }, []);

  useEffect(() => {
    function dismissFromOutside(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function dismissFromKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", dismissFromOutside);
    document.addEventListener("keydown", dismissFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", dismissFromOutside);
      document.removeEventListener("keydown", dismissFromKeyboard);
    };
  }, [closeMenu]);

  return { closeMenu, menu };
}

function MobileMenu({
  closeMenu,
  context,
  routes,
  space,
}: {
  closeMenu: () => void;
  context: PortalContext;
  routes: readonly PortalRoute[];
  space: PortalSpace;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 top-16 bg-brand-navy/20"
      onPointerDown={(event) => {
        if (event.currentTarget === event.target) closeMenu();
      }}
    >
      <div
        className="flex h-full w-[min(21rem,90vw)] flex-col overflow-hidden bg-brand-orange px-4 pb-4 shadow-xl"
        onClick={(event) => {
          const target = event.target;
          if (target instanceof Element && target.closest("a, button")) {
            closeMenu();
          }
        }}
      >
        <PortalUserSummary context={context} />
        <div className="mt-4 shrink-0">
          <PortalSpaceSwitcher
            availableSpaces={context.availableSpaces}
            currentSpace={space}
          />
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <PortalNavList routes={routes} />
        </div>
        <div className="shrink-0 border-t border-brand-navy/15 pt-2">
          <PortalHelpLink />
          <LogoutButton tone="brand" />
        </div>
      </div>
    </div>
  );
}

export function PortalMobileHeader({
  context,
  space,
}: {
  context: PortalContext;
  space: PortalSpace;
}) {
  const { closeMenu, menu } = useDismissableMenu();
  const routes = filterPortalRoutes(
    portalRoutes,
    space,
    new Set(context.capabilityCodes),
  );
  const homePath = space === "operations" ? "/admin" : "/portal";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-brand-orange px-4 lg:hidden">
      <details className="relative" ref={menu}>
        <summary
          aria-label="Open portal navigation"
          className="grid size-10 list-none place-items-center rounded-xl border border-brand-navy/25 [&::-webkit-details-marker]:hidden"
        >
          <Menu aria-hidden="true" className="size-5 text-brand-navy" />
        </summary>
        <MobileMenu
          closeMenu={closeMenu}
          context={context}
          routes={routes}
          space={space}
        />
      </details>
      <Logo className="rounded-lg bg-brand-white p-1.5" href={homePath} compact />
      <span className="max-w-24 truncate text-xs font-semibold text-brand-navy">
        {context.displayName}
      </span>
    </header>
  );
}
