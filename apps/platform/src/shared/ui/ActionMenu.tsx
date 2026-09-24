"use client";

import { MoreHorizontal } from "lucide-react";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";

import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  id: string;
  label: string;
  onAction: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function ActionMenu({
  label,
  items,
}: {
  label: string;
  items: ActionMenuItem[];
}) {
  return (
    <MenuTrigger>
      <Button
        aria-label={label}
        className="flex size-9 items-center justify-center rounded-xl text-brand-navy hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </Button>
      <Popover
        className="z-50 min-w-44 rounded-xl border border-brand-navy/15 bg-brand-white p-1 shadow-lg outline-none"
        offset={4}
        placement="bottom end"
      >
        <Menu aria-label={label} className="outline-none">
          {items.map((item) => (
            <MenuItem
              id={item.id}
              isDisabled={item.disabled}
              key={item.id}
              onAction={item.onAction}
              className={cn(
                "flex min-h-10 cursor-pointer items-center rounded-lg px-3 text-sm outline-none",
                "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[focused]:bg-brand-cream",
                item.destructive ? "text-red-700" : "text-brand-navy",
              )}
            >
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
