import type { Editor } from "@tiptap/core";

interface AskOptions {
  label: string;
  placeholder?: string;
  value?: string;
  /** Document position to anchor to (default: the selection). */
  pos?: number;
}

/**
 * A one-line input next to the text. Resolves with the trimmed value on Enter (possibly ""),
 * or null on Escape / click away. Focus returns to the editor either way.
 */
export function askInline(editor: Editor, { label, placeholder, value = "", pos }: AskOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const anchor = editor.view.coordsAtPos(pos ?? editor.state.selection.from);
    const box = document.createElement("div");
    box.className = "fixed z-[60] w-80 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-float";
    box.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - 328))}px`;
    box.style.top = `${anchor.bottom + 6 + 40 > window.innerHeight ? anchor.top - 46 : anchor.bottom + 6}px`;
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.placeholder = placeholder ?? "";
    input.setAttribute("aria-label", label);
    input.className = "h-8 w-full rounded-md bg-transparent px-2 font-sans text-[13px] outline-none placeholder:text-muted-foreground";
    box.appendChild(input);

    let done = false;
    const finish = (result: string | null) => {
      if (done) return;
      done = true;
      box.remove();
      editor.commands.focus();
      resolve(result);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(input.value.trim());
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(null);
      }
    });
    input.addEventListener("blur", () => finish(null));

    document.body.appendChild(box);
    input.focus();
    input.select();
  });
}
