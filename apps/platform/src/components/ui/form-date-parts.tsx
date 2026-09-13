"use client";

import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import {
  Button,
  DateInput,
  DateSegment,
  FieldError,
  Group,
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
    <Group
      className={cn(
        "flex h-12 w-full items-center rounded-xl border border-slate-300 bg-white",
        "text-sm text-slate-950 outline-none transition",
        "focus-within:border-brand-orange focus-within:ring-3 focus-within:ring-brand-orange/15",
        error && "border-red-400",
        className,
      )}
    >
      <DateInput
        className="flex min-w-0 flex-1 items-center px-4 outline-none"
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
      <Button
        aria-label="Open calendar"
        className="mr-1 grid size-10 shrink-0 place-items-center rounded-lg text-brand-navy outline-none hover:bg-brand-cream focus-visible:ring-2 focus-visible:ring-brand-orange"
      >
        <CalendarDays aria-hidden="true" className="size-5" />
      </Button>
    </Group>
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
