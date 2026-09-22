"use client";

import type { ReactNode } from "react";
import {
  Tab,
  TabList,
  TabPanel,
  Tabs as AriaTabs,
} from "react-aria-components";

import { cn } from "@/lib/utils";

export type TabItem<T extends string = string> = {
  content?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: T;
  label: string;
};

type TabsProps<T extends string> = {
  ariaLabel: string;
  className?: string;
  defaultSelectedId: T;
  items: readonly TabItem<T>[];
  leadingContent?: ReactNode;
  listClassName?: string;
  onSelectionChange?: (id: T) => void;
  orientation?: "horizontal" | "vertical";
  panelClassName?: string;
  selectedContent?: ReactNode;
  selectedId?: T;
  tabListClassName?: string;
};

function TabsList<T extends string>({
  ariaLabel,
  items,
  leadingContent,
  listClassName,
  tabListClassName,
  vertical,
}: Pick<
  TabsProps<T>,
  | "ariaLabel"
  | "items"
  | "leadingContent"
  | "listClassName"
  | "tabListClassName"
> & {
  vertical: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-brand-white",
        vertical
          ? "self-start rounded-2xl border border-brand-navy/15 shadow-sm"
          : "border-b border-brand-navy/15",
        listClassName,
      )}
    >
      {leadingContent}
      <TabList
        aria-label={ariaLabel}
        className={cn(
          "flex",
          vertical
            ? "flex-col gap-1 p-2"
            : "gap-6 overflow-x-auto overflow-y-hidden px-1",
          tabListClassName,
        )}
        items={items}
      >
        {(item) => (
          <Tab
            className={({ isFocusVisible, isSelected }) =>
              cn(
                "flex min-h-12 cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-semibold outline-none",
                vertical
                  ? "rounded-xl px-3 text-brand-navy hover:bg-brand-cream"
                  : "-mb-px border-b-2 border-transparent px-1 text-brand-navy/70 hover:text-brand-navy",
                isSelected &&
                  (vertical
                    ? "bg-brand-navy text-brand-white"
                    : "border-brand-blue text-brand-navy"),
                isFocusVisible && "ring-2 ring-brand-navy ring-offset-2",
              )
            }
            id={item.id}
            isDisabled={item.disabled}
          >
            {item.icon}
            {item.label}
          </Tab>
        )}
      </TabList>
    </div>
  );
}

export function Tabs<T extends string>({
  ariaLabel,
  className,
  defaultSelectedId,
  items,
  leadingContent,
  listClassName,
  onSelectionChange,
  orientation = "horizontal",
  panelClassName,
  selectedContent,
  selectedId,
  tabListClassName,
}: TabsProps<T>) {
  const vertical = orientation === "vertical";

  return (
    <AriaTabs
      className={cn(
        vertical && "grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]",
        className,
      )}
      defaultSelectedKey={selectedId ? undefined : defaultSelectedId}
      onSelectionChange={(key) => onSelectionChange?.(String(key) as T)}
      orientation={orientation}
      selectedKey={selectedId}
    >
      <TabsList
        ariaLabel={ariaLabel}
        items={items}
        leadingContent={leadingContent}
        listClassName={listClassName}
        tabListClassName={tabListClassName}
        vertical={vertical}
      />
      {items.map((item) => (
        <TabPanel
          className={({ isInert }) =>
            cn(
              "min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-brand-navy",
              !vertical && "mt-6",
              isInert && "hidden",
              panelClassName,
            )
          }
          id={item.id}
          key={item.id}
          shouldForceMount
        >
          {selectedContent && item.id === selectedId
            ? selectedContent
            : item.content}
        </TabPanel>
      ))}
    </AriaTabs>
  );
}
