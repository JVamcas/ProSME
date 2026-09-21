"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useEffect, useId } from "react";
import { useController, useFormContext } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";

type FormRichTextFieldProps = {
  className?: string;
  disabled?: boolean;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
};

type ToolbarAction = {
  active?: boolean;
  disabled?: boolean;
  icon: typeof Bold;
  label: string;
  run: () => void;
};

function ToolbarButton({ action }: { action: ToolbarAction }) {
  const Icon = action.icon;
  return (
    <button
      aria-label={action.label}
      aria-pressed={action.active}
      className={cn(
        "grid size-9 place-items-center rounded-md text-brand-navy transition-colors",
        "hover:bg-brand-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy",
        action.active && "bg-brand-blue/20",
      )}
      disabled={action.disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action.run}
      title={action.label}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

export function FormRichTextField({
  className,
  disabled = false,
  label,
  name,
  placeholder,
  required = false,
}: FormRichTextFieldProps) {
  const form = useFormContext();
  const { field, fieldState } = useController({ control: form.control, name });
  const generatedId = useId();
  const editorId = `${generatedId}-editor`;
  const errorId = fieldState.error ? `${generatedId}-error` : undefined;
  const editor = useEditor({
    content: typeof field.value === "string" ? field.value : "",
    editable: !disabled,
    editorProps: {
      attributes: {
        "aria-describedby": errorId ?? "",
        "aria-invalid": fieldState.error ? "true" : "false",
        "aria-label": label,
        class:
          "min-h-40 px-4 py-3 text-sm text-brand-navy outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-brand-blue [&_blockquote]:pl-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-6",
        id: editorId,
        role: "textbox",
      },
    },
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Start writing…" }),
    ],
    immediatelyRender: false,
    onBlur: () => field.onBlur(),
    onUpdate: ({ editor: currentEditor }) => {
      field.onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML());
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || typeof field.value !== "string") return;
    const nextValue = editor.isEmpty ? "" : editor.getHTML();
    if (nextValue !== field.value) {
      editor.commands.setContent(field.value, { emitUpdate: false });
    }
  }, [editor, field.value]);

  const actions: ToolbarAction[] = editor
    ? [
        {
          active: editor.isActive("bold"),
          icon: Bold,
          label: "Bold",
          run: () => editor.chain().focus().toggleBold().run(),
        },
        {
          active: editor.isActive("italic"),
          icon: Italic,
          label: "Italic",
          run: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          active: editor.isActive("strike"),
          icon: Strikethrough,
          label: "Strikethrough",
          run: () => editor.chain().focus().toggleStrike().run(),
        },
        {
          active: editor.isActive("heading", { level: 2 }),
          icon: Heading2,
          label: "Heading 2",
          run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          active: editor.isActive("heading", { level: 3 }),
          icon: Heading3,
          label: "Heading 3",
          run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        {
          active: editor.isActive("bulletList"),
          icon: List,
          label: "Bulleted list",
          run: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          active: editor.isActive("orderedList"),
          icon: ListOrdered,
          label: "Numbered list",
          run: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          active: editor.isActive("blockquote"),
          icon: Quote,
          label: "Block quote",
          run: () => editor.chain().focus().toggleBlockquote().run(),
        },
        {
          disabled: !editor.can().chain().focus().undo().run(),
          icon: Undo2,
          label: "Undo",
          run: () => editor.chain().focus().undo().run(),
        },
        {
          disabled: !editor.can().chain().focus().redo().run(),
          icon: Redo2,
          label: "Redo",
          run: () => editor.chain().focus().redo().run(),
        },
      ]
    : [];

  return (
    <FormField
      className={className}
      error={fieldState.error?.message}
      errorId={errorId}
      htmlFor={editorId}
      label={label}
      required={required}
    >
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-brand-navy/20 bg-brand-white",
          "focus-within:border-brand-navy focus-within:ring-2 focus-within:ring-brand-navy/15",
          fieldState.error && "border-red-600",
          disabled && "opacity-60",
        )}
      >
        <div
          aria-label="Rich text formatting"
          className="flex flex-wrap gap-1 border-b border-brand-navy/15 bg-brand-white p-1.5"
          role="toolbar"
        >
          {actions.map((action) => (
            <ToolbarButton
              action={{ ...action, disabled: disabled || action.disabled }}
              key={action.label}
            />
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </FormField>
  );
}
