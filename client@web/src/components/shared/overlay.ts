/**
 * Opens a dialog/sheet from a menu item without fighting the menu. Radix closes the menu on select and then
 * returns focus to its trigger; opening in the same tick lets that focus return steal focus from the dialog
 * (and leaves both layers half-open). Waiting a frame lets the menu finish closing first, so the dialog gets
 * focus and, on close, hands it back to the trigger.
 *
 * Use from DropdownMenuItem/ContextMenuItem `onSelect` (without preventDefault).
 */
export function openAfterMenuClose(open: () => void) {
  requestAnimationFrame(() => setTimeout(open, 0));
}
