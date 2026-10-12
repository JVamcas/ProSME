import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export function eventLocalSchedule(instant: string | null, zone: string) {
  if (!instant || !Number.isFinite(Date.parse(instant)))
    return { date: "", time: "" };
  try {
    const local = dayjs(instant).tz(zone);
    return { date: local.format("YYYY-MM-DD"), time: local.format("HH:mm") };
  } catch {
    return { date: "", time: "" };
  }
}

export function eventScheduleInstant(date: string, time: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const input = `${date}T${time}`;
  try {
    const instant = dayjs.tz(input, zone);
    // Reject invalid dates and clock times in a daylight-saving gap.
    if (!instant.isValid() || instant.format("YYYY-MM-DDTHH:mm") !== input)
      return null;
    return instant.toISOString();
  } catch {
    return null;
  }
}
