"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-foreground/70 hover:bg-black/[.06] dark:hover:bg-white/[.08]"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-black/[.08] bg-black/[.02] p-1.5 dark:border-white/[.145] dark:bg-white/[.03]">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Gras"
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Italique"
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        label="Souligné"
      >
        <UnderlineIcon size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        label="Barré"
      >
        <Strikethrough size={16} />
      </ToolbarButton>
      <div className="mx-1 h-4 w-px bg-black/[.08] dark:bg-white/[.145]" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Liste à puces"
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Liste numérotée"
      >
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        label="Citation"
      >
        <Quote size={16} />
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "8rem",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose-editor focus:outline-none px-3 py-2 text-sm text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const isEmpty = !value || value === "<p></p>";

  return (
    <div className="overflow-hidden rounded border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-800">
      {editor && <Toolbar editor={editor} />}
      <div className="relative" style={{ minHeight }}>
        {isEmpty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-foreground/40">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
