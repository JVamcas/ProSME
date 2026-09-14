const INVALID_DOTNET_DATE_PREFIX = "0001-01-01";
const MIN_VALID_YEAR = 1901;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDateInput(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  if (value.startsWith(INVALID_DOTNET_DATE_PREFIX)) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (parsed.getUTCFullYear() <= MIN_VALID_YEAR) {
    return null;
  }

  return parsed;
}

function formatWithParts(date: Date, month: "short" | "long"): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month,
    day: "2-digit",
  }).format(date);
}

export function parseAndFormatDate(
  input: string | null | undefined,
  formatter?: ((date: Date) => string) | null,
  fallback = "--",
): string {
  const parsed = parseDateInput(input);
  if (!parsed) {
    return fallback;
  }

  return formatter ? formatter(parsed) : formatDateYYYYMMDD(parsed);
}

export function formatDateYYYYMMDD(date: Date): string {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

export function parseDateYYYYMMDD(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatDateDDMMYYYY(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDatePretty(date: Date): string {
  return formatWithParts(date, "short");
}

export function formatDateTime(dateString: string): string {
  const parsed = parseDateInput(dateString);
  if (!parsed) {
    return "";
  }

  return [
    `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    "@",
    `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`,
  ].join(" ");
}

export function formatRelativeTime(dateString?: string | null): string {
  const parsed = parseDateInput(dateString);
  if (!parsed) {
    return "--";
  }

  const elapsedSeconds = Math.max(
    1,
    Math.floor((Date.now() - parsed.getTime()) / 1000),
  );

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}hr${elapsedHours === 1 ? "" : "s"} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) {
    return `${elapsedDays}d ago`;
  }

  const elapsedWeeks = Math.floor(elapsedDays / 7);
  if (elapsedWeeks < 5) {
    return `${elapsedWeeks}wk${elapsedWeeks === 1 ? "" : "s"} ago`;
  }

  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) {
    return `${elapsedMonths}mo${elapsedMonths === 1 ? "" : "s"} ago`;
  }

  const elapsedYears = Math.floor(elapsedDays / 365);
  return `${elapsedYears}yr${elapsedYears === 1 ? "" : "s"} ago`;
}

export function formatYearMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, 1));
}

export function formatYearMonthValue(value: string, fallback?: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return fallback ?? value;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return fallback ?? value;
  }

  return formatYearMonth(year, month);
}

export function isoToLocalDateString(iso: string | null | undefined): string {
  const parsed = parseDateInput(iso);
  if (!parsed) {
    return iso?.slice(0, 10) ?? "";
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function formatDate(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export function getTaxYearInfo(startDate: string, endDate: string) {
  const startYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
  const endYear = endDate ? new Date(endDate).getFullYear() : startYear;
  const label = startYear === endYear ? `${startYear}` : `${startYear}/${endYear}`;

  return { startYear, endYear, label };
}

export function formatStatusDate(value?: string | null): string {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function formatLocalDate(value?: string | null, fallback = "—"): string {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return fallback;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(parsed);
}

export function formatLocalTime24(value?: string | null, fallback = "--:--"): string {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return fallback;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

export function formatLocalDateTime24(value?: string | null, fallback = "—"): string {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return fallback;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

export function toInputDate(value?: string): string {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return "";
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function toInputDateTimeLocal(value?: Date | string | null): string {
  const parsed = value instanceof Date
    ? value
    : value
      ? parseDateInput(value) ?? new Date()
      : new Date();

  const localDateTime = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return localDateTime.toISOString().slice(0, 16);
}

export function toDisplayDate(value?: string | null, fallback = "N/A"): string {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return fallback;
  }

  return `${pad(parsed.getDate())}-${pad(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
}
