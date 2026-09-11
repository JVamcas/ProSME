import "server-only";

type LogContext = Record<string, boolean | number | string | null | undefined>;

function write(level: "error" | "info" | "warn", event: string, context: LogContext = {}) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });
  const destination = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  destination(record);
}

export const logger = {
  error: (event: string, context?: LogContext) => write("error", event, context),
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
};
