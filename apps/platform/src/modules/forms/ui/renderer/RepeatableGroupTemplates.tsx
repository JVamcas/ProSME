"use client";

import {
  ArrowDown,
  ArrowUp,
  Trash2,
} from "lucide-react";
import {
  getUiOptions,
  type ArrayFieldItemTemplateProps,
  type ArrayFieldTemplateProps,
  type RJSFSchema,
} from "@rjsf/utils";

import { IconButton } from "@/components/ui/button";
import {
  RepeatableGroup,
  RepeatableGroupItem,
} from "@/shared/ui/RepeatableGroup";
import type { DynamicFormValues } from "./FormRenderer";

type RepeatableOptions = {
  addLabel?: string;
  itemLabel?: string;
};

function options(uiSchema: ArrayFieldTemplateProps["uiSchema"]) {
  return getUiOptions(uiSchema) as RepeatableOptions;
}

export function RepeatableArrayFieldTemplate(
  props: ArrayFieldTemplateProps<DynamicFormValues, RJSFSchema>,
) {
  const configured = options(props.uiSchema);
  return (
    <RepeatableGroup
      addLabel={configured.addLabel ?? "Add row"}
      canAdd={Boolean(props.canAdd) && !props.disabled && !props.readonly}
      description={props.schema.description}
      error={props.rawErrors?.filter(Boolean).join(" ")}
      id={props.fieldPathId.$id}
      label={props.title}
      onAdd={() => props.onAddClick()}
      required={props.required}
    >
      {props.items}
    </RepeatableGroup>
  );
}

export function RepeatableArrayFieldItemTemplate(
  props: ArrayFieldItemTemplateProps<DynamicFormValues, RJSFSchema>,
) {
  const configured = options(props.parentUiSchema);
  const buttons = props.buttonsProps;
  const disabled = props.disabled || props.readonly;
  const actions = props.hasToolbar ? (
    <>
      {buttons.hasMoveUp ? (
        <IconButton
          disabled={disabled}
          label={`Move ${configured.itemLabel ?? "row"} ${props.index + 1} up`}
          onClick={buttons.onMoveUpItem}
          type="button"
          variant="ghost"
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </IconButton>
      ) : null}
      {buttons.hasMoveDown ? (
        <IconButton
          disabled={disabled}
          label={`Move ${configured.itemLabel ?? "row"} ${props.index + 1} down`}
          onClick={buttons.onMoveDownItem}
          type="button"
          variant="ghost"
        >
          <ArrowDown aria-hidden="true" className="size-4" />
        </IconButton>
      ) : null}
      {buttons.hasRemove ? (
        <IconButton
          disabled={disabled}
          label={`Remove ${configured.itemLabel ?? "row"} ${props.index + 1}`}
          onClick={buttons.onRemoveItem}
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </IconButton>
      ) : null}
    </>
  ) : undefined;
  return (
    <RepeatableGroupItem
      actions={actions}
      index={props.index}
      itemLabel={configured.itemLabel ?? "Row"}
    >
      {props.children}
    </RepeatableGroupItem>
  );
}
