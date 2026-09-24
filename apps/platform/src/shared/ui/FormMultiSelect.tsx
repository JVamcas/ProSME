"use client";

import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/lib/utils";

export type MultiSelectItem = {
  disabled?: boolean;
  label: string;
  value: string | number;
};

type Position = { left: number; top: number; width: number };

function useDropdown(
  isOpen: boolean,
  close: () => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) close();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) {
      setPosition(null);
      return;
    }
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({ left: rect.left, top: rect.bottom + 8, width: rect.width });
      }
    };
    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [isOpen]);

  return { buttonRef, containerRef, dropdownRef, position };
}

export function FormMultiSelect({
  className,
  defaultValue = [],
  describedBy,
  disabled,
  id,
  invalid,
  items,
  name,
  onBlur,
  onChange,
  onFocus,
  placeholder = "Select options",
  registration,
  value,
}: {
  className?: string;
  defaultValue?: readonly (string | number)[];
  describedBy?: string;
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  items: readonly MultiSelectItem[];
  name?: string;
  onBlur?: (values: string[]) => void;
  onChange?: (values: string[]) => void;
  onFocus?: (values: string[]) => void;
  placeholder?: string;
  registration?: UseFormRegisterReturn;
  value?: readonly (string | number)[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internal, setInternal] = useState(() => defaultValue.map(String));
  const selected = value === undefined ? internal : value.map(String);
  const close = useCallback(() => {
    setIsOpen(false);
    onBlur?.(selected);
  }, [onBlur, selected]);
  const {
    buttonRef,
    containerRef,
    dropdownRef,
    position,
  } = useDropdown(isOpen, close);
  const labels = items
    .filter((item) => selected.includes(String(item.value)))
    .map((item) => item.label);
  const summary = labels.length === 0
    ? placeholder
    : labels.length === 1
      ? labels[0]
      : `${labels.length} selected`;
  const toggle = (itemValue: string) => {
    const next = selected.includes(itemValue)
      ? selected.filter((current) => current !== itemValue)
      : [...selected, itemValue];
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <div className="relative" ref={containerRef}>
      <select
        {...registration}
        aria-hidden="true"
        className="sr-only"
        id={`${id}-values`}
        multiple
        name={registration?.name ?? name}
        onChange={registration?.onChange ?? (() => undefined)}
        tabIndex={-1}
        value={selected}
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <button
        aria-controls={`${id}-options`}
        aria-describedby={describedBy}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={invalid}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-brand-navy/25 bg-brand-white px-4 text-left text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/15 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        disabled={disabled}
        id={id}
        onClick={() => setIsOpen((current) => !current)}
        onFocus={() => onFocus?.(selected)}
        ref={buttonRef}
        type="button"
      >
        <span className={cn("truncate", labels.length === 0 && "text-brand-navy/45")}>
          {summary}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      </button>
      {isOpen && position ? createPortal(
        <div
          aria-multiselectable="true"
          className="z-1000 max-h-64 overflow-y-auto rounded-xl border border-brand-navy/15 bg-brand-white p-2 shadow-2xl"
          id={`${id}-options`}
          ref={dropdownRef}
          role="listbox"
          style={{ ...position, position: "fixed" }}
        >
          {items.map((item) => {
            const itemValue = String(item.value);
            const checked = selected.includes(itemValue);
            return (
              <label
                aria-selected={checked}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-navy hover:bg-brand-orange/5",
                  item.disabled && "cursor-not-allowed opacity-50",
                )}
                key={item.value}
                role="option"
              >
                <input
                  checked={checked}
                  className="size-4 accent-brand-orange"
                  disabled={item.disabled}
                  onChange={() => toggle(itemValue)}
                  type="checkbox"
                />
                <span>{item.label}</span>
              </label>
            );
          })}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
