"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Sparkles,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

function ToolbarButton({
  onClick,
  active,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-foreground/70 hover:bg-black/[.06] dark:hover:bg-white/[.08]"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [hasContent, setHasContent] = useState(!editor.isEmpty);
  const [isRewriting, setIsRewriting] = useState(false);

  useEffect(() => {
    const updateState = () => setHasContent(!editor.isEmpty);
    editor.on("transaction", updateState);
    return () => {
      editor.off("transaction", updateState);
    };
  }, [editor]);

  const handleRewrite = async () => {
    const { from, to, empty } = editor.state.selection;
    const range = empty
      ? { from: 0, to: editor.state.doc.content.size }
      : { from, to };
    const text = editor.state.doc.textBetween(range.from, range.to, "\n");
    if (!text.trim()) return;
    setIsRewriting(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expirée.");
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      editor.chain().focus().insertContentAt(range, body.result).run();
    } catch {
      alert("Échec de la reformulation par l'IA.");
    } finally {
      setIsRewriting(false);
    }
  };

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
      <div className="mx-1 h-4 w-px bg-black/[.08] dark:bg-white/[.145]" />
      <ToolbarButton
        onClick={handleRewrite}
        active={false}
        disabled={!hasContent || isRewriting}
        label={
          isRewriting
            ? "Reformulation en cours…"
            : "Reformuler avec l'IA (le texte sélectionné, ou tout le champ si rien n'est sélectionné)"
        }
      >
        <Sparkles size={16} />
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "8rem",
  readOnly = false,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: value,
    editable: !readOnly,
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

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const isEmpty = !value || value === "<p></p>";

  return (
    <div className="overflow-hidden rounded border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-800">
      {editor && !readOnly && <Toolbar editor={editor} />}
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
