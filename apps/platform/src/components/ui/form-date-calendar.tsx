"use client";

import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useContext } from "react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DatePickerStateContext,
  Dialog,
  Heading,
  Popover,
} from "react-aria-components";

import { cn } from "@/lib/utils";

function CalendarButton({
  children,
  slot,
}: {
  children: React.ReactNode;
  slot: "next" | "previous";
}) {
  return (
    <Button
      className="grid size-9 place-items-center rounded-lg text-brand-navy outline-none hover:bg-brand-cream focus-visible:ring-2 focus-visible:ring-brand-blue"
      slot={slot}
    >
      {children}
    </Button>
  );
}

function CalendarActions({
  maxValue,
  minValue,
}: {
  maxValue?: DateValue;
  minValue?: DateValue;
}) {
  const state = useContext(DatePickerStateContext);
  const currentDate = today(getLocalTimeZone());
  const todayUnavailable =
    Boolean(minValue && currentDate.compare(minValue) < 0) ||
    Boolean(maxValue && currentDate.compare(maxValue) > 0);

  return (
    <div className="mt-3 flex justify-between border-t border-brand-navy/10 pt-3">
      <button
        className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-cream"
        onClick={() => {
          state?.setValue(null);
          state?.close();
        }}
        type="button"
      >
        Clear
      </button>
      <button
        className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-40"
        disabled={todayUnavailable}
        onClick={() => {
          state?.setValue(currentDate);
          state?.close();
        }}
        type="button"
      >
        Today
      </button>
    </div>
  );
}

export function DateCalendarPopover({
  maxValue,
  minValue,
}: {
  maxValue?: DateValue;
  minValue?: DateValue;
}) {
  return (
    <Popover
      className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-brand-navy/15 bg-brand-white p-4 shadow-xl"
      offset={8}
      placement="bottom start"
    >
      <Dialog className="outline-none">
        <Calendar className="text-brand-navy">
          <header className="mb-3 flex items-center justify-between gap-2">
            <CalendarButton slot="previous">
              <ChevronLeft aria-hidden="true" className="size-5" />
            </CalendarButton>
            <Heading className="text-sm font-bold" />
            <CalendarButton slot="next">
              <ChevronRight aria-hidden="true" className="size-5" />
            </CalendarButton>
          </header>
          <CalendarGrid className="w-full border-separate border-spacing-1">
            <CalendarGridHeader>
              {(day) => (
                <CalendarHeaderCell className="pb-1 text-xs font-semibold text-brand-navy/60">
                  {day}
                </CalendarHeaderCell>
              )}
            </CalendarGridHeader>
            <CalendarGridBody>
              {(date) => (
                <CalendarCell
                  className={({
                    isDisabled,
                    isFocusVisible,
                    isOutsideMonth,
                    isSelected,
                  }) =>
                    cn(
                      "grid size-9 cursor-pointer place-items-center rounded-lg text-sm outline-none hover:bg-brand-cream",
                      isOutsideMonth && "text-brand-navy/35",
                      isDisabled && "cursor-not-allowed opacity-35",
                      isSelected && "bg-brand-blue font-bold text-brand-navy",
                      isFocusVisible && "ring-2 ring-brand-orange",
                    )
                  }
                  date={date}
                />
              )}
            </CalendarGridBody>
          </CalendarGrid>
        </Calendar>
        <CalendarActions maxValue={maxValue} minValue={minValue} />
      </Dialog>
    </Popover>
  );
}
