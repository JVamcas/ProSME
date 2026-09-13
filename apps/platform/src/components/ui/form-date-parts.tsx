"use client";

import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import {
  DateInput,
  DateSegment,
  FieldError,
  Label,
  Text,
} from "react-aria-components";

import { cn } from "@/lib/utils";

type DateControlProps = {
  className?: string;
  error?: string;
};

export function DateControl({ className, error }: DateControlProps) {
  return (
    <div className="relative">
      <CalendarDays
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-orange"
      />
      <DateInput
        className={cn(
          "flex h-12 w-full items-center rounded-xl border border-slate-300",
          "bg-white pl-11 pr-4 text-sm text-slate-950 outline-none transition",
          "focus-within:border-orange focus-within:ring-3 focus-within:ring-orange/15",
          error && "border-red-400",
          className,
        )}
      >
        {(segment) => (
          <DateSegment
            segment={segment}
            className={cn(
              "rounded px-0.5 outline-none data-[placeholder]:text-slate-400",
              "focus:bg-orange-pale focus:text-brand-navy",
            )}
          />
        )}
      </DateInput>
    </div>
  );
}

type DateFeedbackProps = {
  description?: ReactNode;
  error?: string;
};

export function DateFeedback({ description, error }: DateFeedbackProps) {
  if (error) {
    return (
      <FieldError className="mt-1.5 text-xs font-medium text-red-600">
        {error}
      </FieldError>
    );
  }

  return description ? (
    <Text slot="description" className="mt-1.5 block text-xs text-slate-500">
      {description}
    </Text>
  ) : null;
}

type DateLabelProps = {
  children: ReactNode;
  className?: string;
};

export function DateLabel({ children, className }: DateLabelProps) {
  return (
    <Label
      className={cn(
        "mb-2 block text-sm font-semibold text-slate-800",
        className,
      )}
    >
      {children}
    </Label>
  );
}

type DateRegistrationInputProps = {
  inputRef?: (instance: HTMLInputElement | null) => void;
  name?: string;
  value: string;
};

export function DateRegistrationInput({
  inputRef,
  name,
  value,
}: DateRegistrationInputProps) {
  return (
    <input ref={inputRef} type="hidden" name={name} value={value} readOnly />
  );
}
