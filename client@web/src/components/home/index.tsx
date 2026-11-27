import { AccountPopover } from "@/components/home/navigation/account-popover";
import { CommandPalette } from "@/components/home/navigation/command-palette";
import { NotificationsPopover } from "@/components/home/notifications-popover";

interface EditorFrameProps {
  children: React.ReactNode;
  /** The app's own title row (title, share, menus); it carries the back-to-home link. */
  editorHeaderContent?: React.ReactNode;
  /** Unused; kept for callers. */
  pathname?: string;
  hideSearch?: boolean;
  isEditorPage?: boolean;
}

/** Frame for the document, sheet and slides editors: their header row on top, the app below. No sidebar. */
export default function EditorFrame({
  children,
  editorHeaderContent,
}: EditorFrameProps) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 px-3 md:px-4">
        <div className="flex min-w-0 flex-1 items-center justify-between">
          {editorHeaderContent}
        </div>
        <div className="flex items-center gap-1">
          <NotificationsPopover />
          <AccountPopover />
        </div>
      </header>
      <div className="min-h-0 w-full flex-1">{children}</div>
      <CommandPalette />
    </div>
  );
}
