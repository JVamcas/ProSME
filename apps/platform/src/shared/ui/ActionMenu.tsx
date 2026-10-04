"use client";

import {
  DropdownButton,
  type DropdownButtonItem,
} from "@/shared/ui/DropdownButton";

export type ActionMenuItem = DropdownButtonItem;

export function ActionMenu({
  label,
  items,
}: {
  label: string;
  items: ActionMenuItem[];
}) {
  return (
    <DropdownButton iconOnly items={items} label={label} />
  );
}
