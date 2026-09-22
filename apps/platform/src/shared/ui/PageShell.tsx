import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  align?: "left" | "center";
  variant?: "plain" | "contained";
};

export type PageShellProps = Omit<PageHeaderProps, "className"> & {
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  icon,
  actions,
  className,
  contentClassName,
  align = "left",
  variant = "plain",
}: PageHeaderProps) {
  const centered = align === "center";

  return (
    <header
      className={cn(
        "w-full",
        variant === "contained" &&
          "rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 sm:py-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-4",
          centered
            ? "flex-col items-center text-center"
            : "flex-col sm:flex-row sm:items-start sm:justify-between",
          contentClassName,
        )}
      >
        <div
          className={cn(
            "flex min-w-0 gap-4",
            centered ? "flex-col items-center" : "items-start",
          )}
        >
          {icon ? (
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                "bg-brand-orange/10 text-brand-orange",
                "[&_svg]:size-5",
              )}
            >
              {icon}
            </div>
          ) : null}

          <div className={cn("min-w-0", centered && "max-w-3xl")}>
            {eyebrow ? (
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-orange">
                {eyebrow}
              </p>
            ) : null}

            <h1
              className={cn(
                "text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl",
                centered && "sm:text-4xl",
              )}
            >
              {title}
            </h1>

            {description ? (
              <p
                className={cn(
                  "mt-2 max-w-3xl text-sm leading-6 text-brand-navy/65 sm:text-base",
                  centered && "mx-auto",
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-2",
              centered ? "justify-center" : "sm:ml-6 sm:justify-end",
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function PageShell({
  children,
  className,
  headerClassName,
  bodyClassName,
  ...headerProps
}: PageShellProps) {
  return (
    <section className={cn("space-y-6", className)}>
      <PageHeader className={headerClassName} {...headerProps} />
      <div className={cn("min-w-0 [&>*:first-child]:mt-0", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
