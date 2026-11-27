"use client";

import { useStore } from "@nanostores/react";
import { Play } from "lucide-react";
import { atom } from "nanostores";
import { AppHeader, pressShortcut } from "@/components/app-header/app-header";
import { type SlidesExtras, slidesMenus } from "@/components/app-header/menus";
import { useLiveDocument } from "@/components/editor/core/use-document-loader";
import { Button } from "@/components/ui/button";
import { useDocumentPermissions } from "@/hooks/use-document-permissions";
import { showToast } from "@/lib/toast";

export type SlidesSaveStatus = "idle" | "saving" | "saved" | "error";
export const $slidesSave = atom<SlidesSaveStatus>("idle");

export type PresentMode = "start" | "current" | "presenter";
/**
 * What the open presentation offers the header (set by SlidesApp while it is mounted).
 * The optional extras add Insert, Arrange and Slide menu items when provided.
 */
export interface SlidesCommands extends SlidesExtras {
  present: (mode: PresentMode) => void;
  print: () => void;
  html: () => void;
  pptx: () => Promise<void>;
}
export const $slidesCommands = atom<SlidesCommands | null>(null);

export function SlidesHeader({ documentId }: { documentId: string }) {
  const { document: doc } = useLiveDocument(documentId);
  const permissions = useDocumentPermissions(doc);
  const save = useStore($slidesSave);
  const commands = useStore($slidesCommands);

  const exportPptx = async () => {
    try {
      await commands?.pptx();
    } catch (e) {
      console.error("[slides] pptx export failed", e);
      showToast.error("Could not create the PowerPoint file");
    }
  };
  const present = (mode: PresentMode) => commands?.present(mode);

  return (
    <AppHeader
      kind="slides"
      doc={doc}
      permissions={permissions}
      status={{ state: save }}
      menus={(file) =>
        slidesMenus({
          ...file,
          hasDeck: !!commands,
          extras: commands ?? {},
          downloadPptx: () => void exportPptx(),
          downloadHtml: () => commands?.html(),
          print: () => commands?.print(),
          // SlidesApp binds these keys on the window; the menu items do exactly what the keys do.
          newSlide: () => pressShortcut("Enter", { ctrlKey: true }),
          duplicateSlide: () => pressShortcut("d", { ctrlKey: true }),
          present,
        })
      }
      primary={
        <Button
          variant="outline"
          disabled={!commands}
          onClick={() => present("current")}
          title="Present from this slide"
          className="h-9 rounded-full pr-4 pl-3.5"
        >
          <Play className="fill-app text-app" />
          Present
        </Button>
      }
      overflowLead={[
        {
          id: "overflow.present",
          label: "Present",
          run: () => present("current"),
          disabled: !commands,
        },
      ]}
    />
  );
}
