import { atom } from "nanostores";

const KEY = "editor.outline.open";

export const $outlineOpen = atom(typeof window !== "undefined" && localStorage.getItem(KEY) !== "0");

$outlineOpen.listen((open) => localStorage.setItem(KEY, open ? "1" : "0"));

export const toggleOutline = () => $outlineOpen.set(!$outlineOpen.get());
