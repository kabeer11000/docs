"use client";
import type { Editor } from "@tiptap/core";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Columns3,
  Rows3,
  Table2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PillButton } from "./toolbar-button";

/** Table options; shown in the toolbar only while the caret is in a table (inserting lives in the + menu). */
export function TableControls({
  editor,
  disabled = false,
}: {
  editor: Editor;
  disabled?: boolean;
}) {
  const run =
    (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) =>
    () =>
      fn(editor.chain().focus()).run();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton label="Table options" active disabled={disabled}>
          <Table2 />
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-52">
        <DropdownMenuItem onSelect={run((c) => c.addRowBefore())}>
          <ArrowUpToLine />
          Row above
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={run((c) => c.addRowAfter())}>
          <ArrowDownToLine />
          Row below
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={run((c) => c.addColumnBefore())}>
          <ArrowLeftToLine />
          Column left
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={run((c) => c.addColumnAfter())}>
          <ArrowRightToLine />
          Column right
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={run((c) => c.deleteRow())}>
          <Rows3 />
          Delete row
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={run((c) => c.deleteColumn())}>
          <Columns3 />
          Delete column
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={run((c) => c.deleteTable())}
        >
          <Trash2 />
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
