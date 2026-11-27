"use client";

import { FolderTab } from "@/components/home/folder-tab";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ItemRef } from "@/state/file-actions";
import {
  ItemName,
  itemStateClass,
  useFileItem,
  useFolderDrop,
} from "./file-item";
import { FileContextMenu, FileDropdown } from "./file-menu";

/** A folder card that selects, opens, renames inline, takes drops (app items and desktop files) and has the file menu. */
export function FolderCard({
  id,
  name,
  fileCount,
}: {
  id: string;
  name: string;
  fileCount: number;
}) {
  const ref: ItemRef = { id, type: "folder" };
  const { props, selected, fresh } = useFileItem(ref);
  const { over, dropProps } = useFolderDrop(id);
  const isMobile = useIsMobile();
  return (
    <FileContextMenu item={ref}>
      <FolderTab
        {...props}
        {...dropProps}
        aria-selected={selected}
        label={name}
        title={<ItemName item={ref} name={name} />}
        fileCount={fileCount}
        className={itemStateClass({ selected, fresh, over })}
        actions={
          <FileDropdown
            item={ref}
            label={`More actions for ${name}`}
            alwaysVisible={isMobile}
          />
        }
      />
    </FileContextMenu>
  );
}
