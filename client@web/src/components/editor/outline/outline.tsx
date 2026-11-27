"use client";
import { useStore } from "@nanostores/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { editorInstance } from "@/state/editor";
import { $outlineOpen, toggleOutline } from "./outline-state";

interface Heading {
  pos: number;
  level: number;
  text: string;
}

const MIN_RAIL = 160;
const MAX_RAIL = 240;
const INDENT = ["pl-3", "pl-6", "pl-9"];

export function collectHeadings(doc: PMNode): Heading[] {
  const out: Heading[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "heading" && node.attrs.level <= 3 && node.textContent.trim()) {
      out.push({ pos, level: node.attrs.level, text: node.textContent.trim() });
    }
    return !node.isTextblock;
  });
  return out;
}

function snapshot(editor: Editor) {
  const headings = collectHeadings(editor.state.doc);
  const head = editor.state.selection.from;
  const active = headings.findLast((h) => h.pos < head)?.pos ?? null;
  return { headings, active };
}

/** Left rail on the canvas listing H1-H3; only shown where it fits beside the page. */
export function Outline() {
  const editor = useStore(editorInstance);
  const open = useStore($outlineOpen);
  const [data, setData] = useState<{ headings: Heading[]; active: number | null }>({ headings: [], active: null });
  const [width, setWidth] = useState(0);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        toggleOutline();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !editor || editor.isDestroyed) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => !editor.isDestroyed && setData(snapshot(editor)), 150);
    };
    setData(snapshot(editor));
    editor.on("transaction", update);
    return () => {
      clearTimeout(timer);
      editor.off("transaction", update);
    };
  }, [editor, open]);

  // The space between the canvas edge and the page decides whether the rail fits.
  useEffect(() => {
    const self = anchor.current;
    const canvas = self?.parentElement;
    if (!open || !self || !canvas) return;
    const measure = () => {
      const sheet = canvas.querySelector(".paper-sheet");
      const space = sheet ? sheet.getBoundingClientRect().left - self.getBoundingClientRect().left - 24 : 0;
      setWidth(space >= MIN_RAIL ? Math.min(space, MAX_RAIL) : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    const sheet = canvas.querySelector(".paper-sheet");
    if (sheet) ro.observe(sheet);
    return () => ro.disconnect();
  }, [open]);

  const go = (pos: number) => {
    if (!editor || editor.isDestroyed) return;
    editor.chain().focus(pos + 1, { scrollIntoView: false }).run();
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={anchor} className="sticky top-0 z-10 hidden h-0 lg:block">
      {open && width > 0 && (
        <nav
          aria-label="Document outline"
          style={{ width }}
          className="absolute top-2 left-0 flex max-h-[calc(100dvh-10rem)] flex-col font-sans"
        >
          <div className="flex h-7 shrink-0 items-center justify-between pl-3">
            <span className="text-xs font-medium text-muted-foreground">Outline</span>
            <Button variant="ghost" size="icon-sm" aria-label="Hide outline" title="Hide outline" className="text-muted-foreground" onClick={toggleOutline}>
              <X />
            </Button>
          </div>
          {data.headings.length === 0 ? (
            <p className="pl-3 text-xs text-muted-foreground">Headings you add appear here</p>
          ) : (
            <ul className="min-h-0 overflow-y-auto pb-2">
              {data.headings.map((h) => {
                const active = h.pos === data.active;
                return (
                  <li key={h.pos}>
                    <button
                      type="button"
                      onClick={() => go(h.pos)}
                      aria-current={active ? "location" : undefined}
                      title={h.text}
                      className={cn(
                        "block w-full truncate rounded-r-md border-l-2 py-1 pr-2 text-left text-[13px] outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40",
                        INDENT[h.level - 1],
                        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground",
                        h.level === 1 && "font-medium",
                      )}
                    >
                      {h.text}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      )}
    </div>
  );
}
