"use client";

import { Collaboration } from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import type * as Y from "yjs";
import { ImageDrop } from "@/components/editor/extensions/image-drop";
import { slideExtensions } from "./editor-kit";

/** A small TipTap editor bound to one named Y.XmlFragment of the presentation doc. */
export function RegionEditor({
  doc,
  name,
  editable,
  placeholder,
  className,
  onFocus,
  ...rest
}: {
  doc: Y.Doc;
  name: string;
  editable: boolean;
  placeholder: string;
  className?: string;
  onFocus?: (editor: Editor) => void;
  "data-region"?: string;
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editable,
      extensions: [
        ...slideExtensions,
        ImageDrop,
        Placeholder.configure({ placeholder }),
        Collaboration.configure({ document: doc, field: name }),
      ],
      editorProps: { attributes: { "aria-label": placeholder, spellcheck: "true" } },
      onFocus: ({ editor }) => onFocus?.(editor),
    },
    [doc, name],
  );

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(editable);
  }, [editor, editable]);

  return (
    <EditorContent
      editor={editor}
      className={className}
      // Clicks on the empty part of a region still place the caret.
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget || !editor?.isEditable) return;
        e.preventDefault();
        editor.commands.focus("end");
      }}
      {...rest}
    />
  );
}
