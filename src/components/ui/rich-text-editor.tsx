"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  MdFormatBold, MdFormatItalic, MdFormatListBulleted, MdFormatListNumbered,
  MdFormatQuote, MdHorizontalRule, MdUndo, MdRedo,
} from "react-icons/md";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: Editor) => void;
  minHeight?: number;
}

function ToolbarButton({
  onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center justify-center rounded-sm transition-colors"
      style={{
        width: 28, height: 28,
        background: active ? "rgba(0,120,212,0.12)" : "transparent",
        color: active ? "rgb(0,120,212)" : "rgb(var(--foreground))",
        border: active ? "1px solid rgba(0,120,212,0.3)" : "1px solid transparent",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 18, background: "rgb(var(--border))", margin: "0 2px" }} />;
}

export function RichTextEditor({ value, onChange, placeholder = "Ξεκινήστε να γράφετε...", onEditorReady, minHeight = 320 }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onCreate: ({ editor }) => onEditorReady?.(editor),
    editorProps: {
      attributes: {
        class: "outline-none prose-editor",
        style: `min-height:${minHeight}px; padding: 12px 14px; font-size: 13px; line-height: 1.65; color: rgb(var(--foreground));`,
      },
    },
  });

  // Sync when value changes externally (AI inject)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== "<p></p>" && value !== "") {
      editor.commands.setContent(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{ border: "1px solid #8a8886" }}
      onFocus={() => {}}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 flex-wrap px-2 py-1.5"
        style={{ borderBottom: "1px solid rgb(var(--border))", background: "rgb(var(--background))" }}
      >
        {/* Headings */}
        <ToolbarButton title="Επικεφαλίδα 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>H1</span>
        </ToolbarButton>
        <ToolbarButton title="Επικεφαλίδα 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>H2</span>
        </ToolbarButton>
        <ToolbarButton title="Επικεφαλίδα 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>H3</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Έντονη γραφή" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <MdFormatBold size={16} />
        </ToolbarButton>
        <ToolbarButton title="Πλάγια γραφή" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <MdFormatItalic size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Λίστα με κουκκίδες" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <MdFormatListBulleted size={16} />
        </ToolbarButton>
        <ToolbarButton title="Αριθμημένη λίστα" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <MdFormatListNumbered size={16} />
        </ToolbarButton>
        <ToolbarButton title="Παράθεση" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>
          <MdFormatQuote size={16} />
        </ToolbarButton>
        <ToolbarButton title="Οριζόντια γραμμή" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <MdHorizontalRule size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Αναίρεση" onClick={() => editor.chain().focus().undo().run()}>
          <MdUndo size={16} />
        </ToolbarButton>
        <ToolbarButton title="Επανάληψη" onClick={() => editor.chain().focus().redo().run()}>
          <MdRedo size={16} />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <div
        style={{ background: "rgb(var(--card))" }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      <style>{`
        .prose-editor h1 { font-size: 1.4rem; font-weight: 700; margin: 1em 0 0.4em; }
        .prose-editor h2 { font-size: 1.15rem; font-weight: 600; margin: 0.9em 0 0.35em; }
        .prose-editor h3 { font-size: 1rem; font-weight: 600; margin: 0.8em 0 0.3em; }
        .prose-editor p { margin: 0.4em 0; }
        .prose-editor ul, .prose-editor ol { padding-left: 1.4em; margin: 0.4em 0; }
        .prose-editor li { margin: 0.2em 0; }
        .prose-editor blockquote { border-left: 3px solid rgb(0,120,212); padding-left: 12px; margin: 0.6em 0; opacity: 0.8; }
        .prose-editor hr { border: none; border-top: 1px solid rgb(var(--border)); margin: 1em 0; }
        .prose-editor strong { font-weight: 600; }
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: rgb(var(--muted-foreground)); pointer-events: none; height: 0; font-size: 13px; }
      `}</style>
    </div>
  );
}
