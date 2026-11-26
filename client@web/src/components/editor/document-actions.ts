import type { Editor } from "@tiptap/react";
import { $paperSettings } from "@/lib/paper";
import { showToast } from "@/lib/toast";
import { editorInstance } from "@/state/editor";

// File menu actions shared by the header menu and keyboard shortcuts.

export type DownloadKind = "pdf" | "docx" | "md" | "html" | "txt";

const safeName = (title: string) => title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Document";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function liveEditor(): Editor | null {
  const editor = editorInstance.get();
  if (!editor || editor.isDestroyed) {
    showToast.error("The document is still loading");
    return null;
  }
  return editor;
}

export async function printDocument(title: string) {
  const editor = liveEditor();
  if (!editor) return;
  const { printEditor } = await import("@/lib/export/print");
  printEditor(editor.view.dom, $paperSettings.get(), title);
}

export async function downloadDocument(kind: DownloadKind, title: string) {
  if (kind === "pdf") return printDocument(title);
  const editor = liveEditor();
  if (!editor) return;
  const html = editor.getHTML();
  const paper = $paperSettings.get();
  const name = safeName(title);
  try {
    if (kind === "md") {
      const { htmlToMarkdown } = await import("@/lib/export/markdown");
      saveBlob(new Blob([htmlToMarkdown(html)], { type: "text/markdown;charset=utf-8" }), `${name}.md`);
    } else if (kind === "html") {
      const { buildStandaloneHtml } = await import("@/lib/export/standalone-html");
      saveBlob(new Blob([buildStandaloneHtml({ title, bodyHtml: html, paper })], { type: "text/html;charset=utf-8" }), `${name}.html`);
    } else if (kind === "txt") {
      const { htmlToText } = await import("@/lib/export/standalone-html");
      const text = htmlToText(html, (h) => new DOMParser().parseFromString(h, "text/html"));
      saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${name}.txt`);
    } else if (kind === "docx") {
      const id = showToast.loading("Preparing Word document");
      const { htmlToDocx } = await import("@/lib/export/docx");
      const blob = await htmlToDocx({ html, title, paper });
      const { toast } = await import("sonner");
      toast.dismiss(id);
      saveBlob(blob, `${name}.docx`);
    }
  } catch (error) {
    console.error("[export]", error);
    showToast.error("Export failed", error instanceof Error ? error.message : undefined);
  }
}

export async function copyDocumentAs(kind: "md" | "html") {
  const editor = liveEditor();
  if (!editor) return;
  const html = editor.getHTML();
  try {
    if (kind === "md") {
      const { htmlToMarkdown } = await import("@/lib/export/markdown");
      await navigator.clipboard.writeText(htmlToMarkdown(html));
    } else {
      // Rich paste into editors, HTML source into plain-text fields.
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([html], { type: "text/plain" }),
        }),
      ]);
    }
    showToast.success(kind === "md" ? "Copied as Markdown" : "Copied as HTML");
  } catch {
    showToast.error("Could not copy to the clipboard");
  }
}
