"use client";

import {
  LoaderCircle,
  Pencil,
  Power,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { GeneralButton, type ButtonProps } from "./button";
import { cn } from "@/lib/utils";

type ActionButtonProps = Omit<
  ButtonProps,
  "aria-label" | "children" | "size" | "title" | "variant"
> & {
  isLoading?: boolean;
  title?: string;
};

type SharedActionButtonProps = ActionButtonProps & {
  defaultTitle: string;
  icon: LucideIcon;
  iconClassName: string;
};

function ActionButton({
  defaultTitle,
  className,
  disabled,
  icon: Icon,
  iconClassName,
  isLoading = false,
  title = defaultTitle,
  type = "button",
  ...buttonProps
}: SharedActionButtonProps) {
  return (
    <GeneralButton
      {...buttonProps}
      aria-busy={isLoading || undefined}
      aria-label={title}
      className={cn("size-9 rounded-xl p-0", iconClassName, className)}
      disabled={disabled || isLoading}
      size="icon"
      title={title}
      type={type}
      variant="ghost"
    >
      {isLoading ? (
        <LoaderCircle className="size-[18px] animate-spin" />
      ) : (
        <Icon className="size-[18px]" />
      )}
    </GeneralButton>
  );
}

export function EditButton(props: ActionButtonProps) {
  return (
    <ActionButton
      defaultTitle="Edit"
      icon={Pencil}
      iconClassName="[&_svg]:text-brand-navy"
      {...props}
    />
  );
}

export function DeleteButton(props: ActionButtonProps) {
  return (
    <ActionButton
      defaultTitle="Delete"
      icon={Trash2}
      iconClassName="hover:bg-red-50 [&_svg]:text-red-600"
      {...props}
    />
  );
}

export function ActivateButton(props: ActionButtonProps) {
  return (
    <ActionButton
      defaultTitle="Activate"
      icon={Power}
      iconClassName="hover:bg-green-50 [&_svg]:text-green-600"
      {...props}
    />
  );
}

export function DeactivateButton(props: ActionButtonProps) {
  return (
    <ActionButton
      defaultTitle="Deactivate"
      icon={Power}
      iconClassName="hover:bg-red-50 [&_svg]:text-red-600"
      {...props}
    />
  );
}
