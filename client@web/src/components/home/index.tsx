import { SiteHeader } from "@/components/home/header";
import { WorkspaceShell } from "@/components/home/workspace-shell";

interface PageProps {
  children: React.ReactNode | React.ReactNode[];
  /** Unused; search lives in the sidebar and Ctrl+K palette. Kept for callers. */
  hideSearch?: boolean;
  /** Unused; the sidebar reads the route. Kept for callers. */
  pathname?: string;
  folderId?: string;
  isEditorPage?: boolean;
  editorHeaderContent?: React.ReactNode; // For editor page: title row content
}

/** Shell with a top bar, used by the editor. Workspace pages get the shell from app/(workspace)/layout. */
export default function HomePage({
  children,
  isEditorPage = false,
  editorHeaderContent,
}: PageProps) {
  return (
    <WorkspaceShell
      defaultOpen={!isEditorPage}
      header={
        <SiteHeader
          isEditorPage={isEditorPage}
          editorHeaderContent={editorHeaderContent}
        />
      }
    >
      {children}
    </WorkspaceShell>
  );
}
