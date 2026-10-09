"use client";

import dayjs, { type Dayjs } from "dayjs";

import { GeneralButton } from "@/components/ui/button";
import { isFormDateInRange } from "@/shared/utils/formDateValues";

type DateCalendarActionsProps = {
  max: Dayjs | null;
  min: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  onClose: () => void;
  value: Dayjs | null;
  withTime: boolean;
};

export function DateCalendarActions({
  max,
  min,
  onChange,
  onClose,
  value,
  withTime,
}: DateCalendarActionsProps) {
  const today = dayjs().startOf("day");
  const selectedToday = withTime && value
    ? today
        .hour(value.hour())
        .minute(value.minute())
        .second(value.second())
        .millisecond(value.millisecond())
    : today;

  return (
    <div className="flex justify-between py-2">
      <GeneralButton
        onClick={() => {
          onChange(null);
          onClose();
        }}
        size="compact"
        variant="ghost"
      >
        Clear
      </GeneralButton>
      <GeneralButton
        disabled={!isFormDateInRange(selectedToday, min, max)}
        onClick={() => {
          onChange(selectedToday);
          onClose();
        }}
        size="compact"
        variant="ghost"
      >
        Today
      </GeneralButton>
    </div>
  );
}
