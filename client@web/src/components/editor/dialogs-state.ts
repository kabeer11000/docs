import { atom } from "nanostores";

// Open state of lazily loaded editor dialogs, kept apart so importing it does not pull the dialogs in.
export const $pageSetupOpen = atom(false);
export const $shortcutsOpen = atom(false);
