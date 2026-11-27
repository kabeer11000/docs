"use client";
import { useStore } from "@nanostores/react";
import { $paperSettings, pageGeometry } from "@/lib/paper";
import { PaperSheet } from "./paper-sheet";

const bar = "rounded-full bg-muted animate-pulse";

/** Same geometry as the loaded editor (floating toolbar, real-size page) so nothing moves. */
export const EditorSkeleton = () => {
  const geometry = pageGeometry(useStore($paperSettings));
  return (
    <div className="flex-1 overflow-hidden bg-background px-2 pb-16 md:px-8">
      <div className="flex justify-center px-1 pt-3 pb-4">
        <div className="h-10 w-[min(44rem,100%)] rounded-full bg-card shadow-float" />
      </div>
      <PaperSheet geometry={geometry} pages={1}>
        <div
          className="relative space-y-3"
          style={{ padding: "var(--m-top) var(--m-right) 0 var(--m-left)" }}
        >
          <div className={`h-7 w-2/3 ${bar}`} />
          <div className={`h-3.5 w-full ${bar}`} />
          <div className={`h-3.5 w-full ${bar}`} />
          <div className={`h-3.5 w-4/5 ${bar}`} />
        </div>
      </PaperSheet>
    </div>
  );
};
