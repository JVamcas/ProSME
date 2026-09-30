"use client";

import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DropdownButtonItem = {
  id: string;
  label: string;
  onAction: () => void;
  description?: string;
  disabled?: boolean;
  destructive?: boolean;
};

export function DropdownButton({
  ariaLabel,
  disabled = false,
  iconOnly = false,
  items,
  label,
}: {
  ariaLabel?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  items: DropdownButtonItem[];
  label: string;
}) {
  const accessibleLabel = ariaLabel ?? label;

  return (
    <MenuTrigger>
      <Button
        aria-label={accessibleLabel}
        className={iconOnly
          ? "flex size-9 items-center justify-center rounded-xl text-brand-navy hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy"
          : buttonVariants({ variant: "navy" })
        }
        isDisabled={disabled}
        type="button"
      >
        {iconOnly ? (
          <MoreHorizontal aria-hidden="true" className="size-5" />
        ) : (
          <>
            <span>{label}</span>
            <ChevronDown aria-hidden="true" className="size-4" />
          </>
        )}
      </Button>
      <Popover
        className="z-50 max-h-[var(--available-height)] min-w-56 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-brand-navy/15 bg-brand-white p-1 shadow-lg outline-none"
        containerPadding={12}
        isNonModal
        offset={4}
        placement="bottom end"
        shouldFlip
      >
        <Menu aria-label={accessibleLabel} className="outline-none">
          {items.map((item) => (
            <MenuItem
              className={cn(
                "flex min-h-10 cursor-pointer flex-col items-start justify-center rounded-lg px-3 py-2 text-sm outline-none",
                "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[focused]:bg-brand-cream",
                item.destructive ? "text-red-700" : "text-brand-navy",
              )}
              id={item.id}
              isDisabled={item.disabled}
              key={item.id}
              onAction={item.onAction}
            >
              <span className="font-semibold">{item.label}</span>
              {item.description ? (
                <span className="text-xs font-normal text-brand-navy/60">
                  {item.description}
                </span>
              ) : null}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
