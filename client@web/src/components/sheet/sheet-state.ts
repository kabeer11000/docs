import { atom } from "nanostores";
import type { Grid } from "@/lib/sheet/grid";

export type SheetSaveStatus = "idle" | "saving" | "saved" | "error";

export const $sheetSave = atom<{ status: SheetSaveStatus; error: string | null }>({ status: "idle", error: null });

/** Set by the grid while it is mounted; lets the header export what is on screen and insert charts. */
export const $sheetEngine = atom<{ activeSheet: () => { name: string; grid: Grid }; insertChart: () => void } | null>(null);
