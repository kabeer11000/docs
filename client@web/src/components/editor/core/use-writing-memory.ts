import type { Editor } from "@tiptap/react";
import { atom } from "nanostores";
import { useEffect } from "react";
import { loadDay, loadSpot, recordWords, saveDay, saveSpot, wordsWritten } from "@/lib/writing-memory";
import { editorUIState } from "@/state/editor";

/** Words written today across all documents in this browser (status bar). */
export const $wordsToday = atom(0);

const scrollParent = (el: HTMLElement | null): HTMLElement | null => {
  for (let n = el?.parentElement; n; n = n.parentElement) {
    const { overflowY } = getComputedStyle(n);
    if ((overflowY === "auto" || overflowY === "scroll") && n.scrollHeight > n.clientHeight) return n;
  }
  return null;
};

/**
 * Reopens a document where you left it (cursor and scroll) and keeps today's word tally.
 * Runs once the stored content is in the editor.
 */
export function useWritingMemory(editor: Editor | null, documentId: string, ready: boolean, canEdit: boolean) {
  useEffect(() => {
    if (!editor || editor.isDestroyed || !ready) return;
    const view = editor.view;

    // Restore after layout settles (pagination adds page gaps on the next frame).
    const spot = loadSpot(documentId);
    const raf = requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      const size = editor.state.doc.content.size;
      const from = spot ? Math.min(Math.max(spot.from, 1), size - 1) : 1;
      if (canEdit) editor.chain().setTextSelection(from).focus(undefined, { scrollIntoView: !spot }).run();
      const scroller = scrollParent(view.dom as HTMLElement);
      if (scroller && spot) scroller.scrollTop = spot.top;
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const remember = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (editor.isDestroyed) return;
        const scroller = scrollParent(view.dom as HTMLElement);
        saveSpot(documentId, { from: editor.state.selection.from, top: scroller?.scrollTop ?? 0 });
      }, 400);
    };
    editor.on("selectionUpdate", remember);
    const scroller = scrollParent(view.dom as HTMLElement);
    scroller?.addEventListener("scroll", remember, { passive: true });

    // Word tally: the count when the document opened today is the baseline.
    const tally = (words: number) => {
      const log = recordWords(loadDay(), documentId, words);
      saveDay(log);
      $wordsToday.set(wordsWritten(log));
    };
    tally(editorUIState.get().wordCount);
    let last = editorUIState.get().wordCount;
    let tallyTimer: ReturnType<typeof setTimeout> | undefined;
    const unlisten = editorUIState.listen(({ wordCount }) => {
      if (wordCount === last) return;
      last = wordCount;
      clearTimeout(tallyTimer);
      tallyTimer = setTimeout(() => tally(wordCount), 800);
    });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(tallyTimer);
      editor.off("selectionUpdate", remember);
      scroller?.removeEventListener("scroll", remember);
      unlisten();
      remember();
    };
  }, [editor, documentId, ready, canEdit]);
}
