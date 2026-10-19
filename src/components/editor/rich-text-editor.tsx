"use client";

import { useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadImage } from "./image-upload";

interface RichTextEditorProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  /** Dossier d'upload des images insérées (id du projet). */
  uploadFolder: string;
  label: string;
}

/** Éditeur riche (Tiptap) : le HTML est recopié dans un champ caché puis assaini côté serveur. */
export function RichTextEditor({ name, defaultValue = "", placeholder, uploadFolder, label }: RichTextEditorProps) {
  const [html, setHtml] = useState(defaultValue);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["https", "http", "mailto"] },
      }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? "Raconte…" }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: { class: "tiptap prose-sparkly px-5 py-4", "aria-label": label, role: "textbox", "aria-multiline": "true" },
    },
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? "" : editor.getHTML()),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface focus-within:border-spark focus-within:ring-3 focus-within:ring-spark/15">
      <input type="hidden" name={name} value={html} />
      {editor && <Toolbar editor={editor} uploadFolder={uploadFolder} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, uploadFolder }: { editor: Editor; uploadFolder: string }) {
  const [uploading, setUploading] = useState(false);

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adresse du lien (https://…)", previous ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  async function insertImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const src = await uploadImage(file, { bucket: "project-media", folder: uploadFolder });
      editor.chain().focus().setImage({ src }).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  const buttons = [
    { label: "Titre", icon: Heading2, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Sous-titre", icon: Heading3, active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Gras", icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italique", icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Liste à puces", icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Liste numérotée", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Citation", icon: Quote, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Lien", icon: Link2, active: editor.isActive("link"), run: setLink },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface-muted/60 px-2 py-1.5" role="toolbar" aria-label="Mise en forme">
      {buttons.map(({ label, icon: Icon, active, run }) => (
        <button
          key={label}
          type="button"
          onClick={run}
          aria-label={label}
          aria-pressed={active}
          title={label}
          className={cn("rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground", active && "bg-surface text-spark-strong")}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <label className="cursor-pointer rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground" title="Insérer une image">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        <span className="sr-only">Insérer une image</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={insertImage} disabled={uploading} />
      </label>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <button type="button" onClick={() => editor.chain().focus().undo().run()} aria-label="Annuler" title="Annuler" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground">
        <Undo2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => editor.chain().focus().redo().run()} aria-label="Rétablir" title="Rétablir" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground">
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  );
}
