import { toast } from "sonner";

type Entry = { toastId?: string | number; undo: () => unknown };

/** The undo offered by the toast on screen; Ctrl/Cmd+Z runs it while the toast is up. */
let current: Entry | null = null;

const release = (entry: Entry) => {
  if (current === entry) current = null;
};

/** Short toast with an Undo button, e.g. "Moved to Trash". */
export function offerUndo(message: string, undo: () => unknown) {
  if (current?.toastId !== undefined) toast.dismiss(current.toastId);
  const entry: Entry = { undo };
  current = entry;
  entry.toastId = toast(message, {
    duration: 6000,
    action: {
      label: "Undo",
      onClick: () => {
        release(entry);
        entry.undo();
      },
    },
    onDismiss: () => release(entry),
    onAutoClose: () => release(entry),
  });
}

/** Runs the pending undo; false when there is none. */
export function undoLast(): boolean {
  const entry = current;
  if (!entry) return false;
  current = null;
  if (entry.toastId !== undefined) toast.dismiss(entry.toastId);
  entry.undo();
  return true;
}
