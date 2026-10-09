import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/en-gb";

dayjs.extend(customParseFormat);

const dateFormat = "YYYY-MM-DD";
const dateTimeFormat = "YYYY-MM-DD[T]HH:mm:ss";

export function parseFormDate(value?: string, withTime = false): Dayjs | null {
  if (!value) {
    return null;
  }

  const formats = withTime
    ? ["YYYY-MM-DD[T]HH:mm", dateTimeFormat, `${dateTimeFormat}.SSS`]
    : [dateFormat];
  const normalized = withTime
    ? value.replace(
        /\.(\d{1,2})$/,
        (_, fraction: string) => `.${fraction.padEnd(3, "0")}`,
      )
    : value;
  const parsed = dayjs(normalized, formats, "en-gb", true);
  return parsed.isValid() ? parsed : null;
}

export function formatFormDate(value: Dayjs | null, withTime: boolean): string {
  if (!value) {
    return "";
  }

  const format = withTime ? dateTimeFormat : dateFormat;
  const milliseconds = withTime && value.millisecond() !== 0 ? ".SSS" : "";
  return value.format(`${format}${milliseconds}`);
}

export function isFormDateInRange(
  value: Dayjs,
  min: Dayjs | null,
  max: Dayjs | null,
) {
  return !(min && value.isBefore(min)) && !(max && value.isAfter(max));
}

export function disabledFormDateTimes(
  value: Dayjs,
  min: Dayjs | null,
  max: Dayjs | null,
) {
  function unavailable(
    count: number,
    unit: "hour" | "minute" | "second",
    base: Dayjs,
  ) {
    return Array.from({ length: count }, (_, index) => index).filter((index) => {
      const candidate = base.set(unit, index);
      return Boolean(
        (min && candidate.endOf(unit).isBefore(min)) ||
        (max && candidate.startOf(unit).isAfter(max)),
      );
    });
  }

  return {
    disabledHours: () => unavailable(24, "hour", value),
    disabledMinutes: (hour: number) =>
      unavailable(60, "minute", value.hour(hour)),
    disabledSeconds: (hour: number, minute: number) =>
      unavailable(60, "second", value.hour(hour).minute(minute)),
  };
}
