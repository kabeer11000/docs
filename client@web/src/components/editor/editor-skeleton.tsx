"use client";
import { useStore } from "@nanostores/react";
import { $paperSettings, pageGeometry } from "@/lib/paper";
import { PaperSheet } from "./paper-sheet";

const bar = "rounded-sm bg-muted animate-pulse";

/** Same geometry as the loaded editor (toolbar row, real-size page, status bar) so nothing moves. */
export const EditorSkeleton = () => {
  const geometry = pageGeometry(useStore($paperSettings));
  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-2 bg-background px-2 md:px-3">
        <div className={`h-5 w-[min(36rem,70%)] ${bar}`} />
      </div>
      <div className="flex-1 overflow-hidden bg-paper-canvas px-2 pt-4 pb-8 md:px-8">
        <PaperSheet geometry={geometry} pages={1}>
          <div className="relative space-y-3" style={{ padding: "var(--m-top) var(--m-right) 0 var(--m-left)" }}>
            <div className={`h-7 w-2/3 ${bar}`} />
            <div className={`h-3.5 w-full ${bar}`} />
            <div className={`h-3.5 w-full ${bar}`} />
            <div className={`h-3.5 w-4/5 ${bar}`} />
          </div>
        </PaperSheet>
      </div>
      <div className="h-7 shrink-0 bg-background" />
    </>
  );
};
