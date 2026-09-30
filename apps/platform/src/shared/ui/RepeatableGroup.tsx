"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { GeneralButton } from "@/components/ui/button";
import { FieldError } from "@/shared/ui/FormPrimitives";

export function RepeatableGroup({
  addLabel,
  canAdd,
  children,
  description,
  error,
  id,
  label,
  onAdd,
  required,
}: {
  addLabel: string;
  canAdd: boolean;
  children: ReactNode;
  description?: string;
  error?: string;
  id: string;
  label: string;
  onAdd: () => void;
  required?: boolean;
}) {
  return (
    <fieldset
      aria-describedby={error ? `${id}-error` : undefined}
      className="border-0 p-0"
      id={id}
    >
      <legend className="font-bold text-brand-navy">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-brand-orange">*</span>
        ) : null}
      </legend>
      {description ? (
        <p className="mt-1 text-xs text-brand-navy/60">{description}</p>
      ) : null}
      <div className="mt-4 grid gap-4">{children}</div>
      <FieldError id={`${id}-error`} message={error} />
      {canAdd ? (
        <GeneralButton
          className="mt-4"
          onClick={onAdd}
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-4" />
          {addLabel}
        </GeneralButton>
      ) : null}
    </fieldset>
  );
}

export function RepeatableGroupItem({
  actions,
  children,
  index,
  itemLabel,
}: {
  actions?: ReactNode;
  children: ReactNode;
  index: number;
  itemLabel: string;
}) {
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-brand-cream/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-brand-navy">
          {itemLabel} {index + 1}
        </h3>
        {actions ? <div className="flex gap-1">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
