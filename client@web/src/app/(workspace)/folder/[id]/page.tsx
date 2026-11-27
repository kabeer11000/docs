"use client";

import { useStore } from "@nanostores/react";
import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { PageBody } from "@/components/home/page-body";
import { useViewMode, ViewToggle } from "@/components/home/view-toggle";
import { FolderBreadcrumbs } from "@/components/shared/ui/folder-breadcrumbs";
import { FolderOptions } from "@/components/shared/ui/folder-options";
import { LiveListView } from "@/components/shared/ui/live-list-view";
import { $auth } from "@/state/auth";

export default function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user } = useStore($auth);
  const [view, setView] = useViewMode("folder");
  const { id } = use(params);
  // The root folder is the vault itself.
  const isRoot = !id || id === "root" || id === "home" || id === user?.id;

  useEffect(() => {
    if (isRoot) router.replace("/vault");
  }, [isRoot, router]);

  // The workspace layout only renders pages once signed in.
  if (!user || isRoot) return null;

  return (
    <PageBody
      title={<FolderBreadcrumbs folderId={id} />}
      actions={
        <div className="flex items-center gap-1">
          <FolderOptions folderId={id} />
          <ViewToggle view={view} onChange={setView} />
        </div>
      }
    >
      <LiveListView
        parent={id}
        showHeadline={false}
        collapsible={false}
        mode="folder-contents"
        view={view}
        prefsKey="folder"
      />
    </PageBody>
  );
}
