"use client";
import { useStore } from "@nanostores/react";
import {
  Grid3X3,
  Minus,
  Plus,
  Settings,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editorActions, editorUIState } from "@/state/editor";

export function TableControls({ disabled = false }: { disabled?: boolean }) {
  const uiState = useStore(editorUIState);
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);

  const handleInsertTable = () => {
    editorActions.insertTable();
    setInsertDialogOpen(false);
  };

  const handleInsertCustomTable = () => {
    // For future implementation with custom rows/cols
    editorActions.insertTable();
    setInsertDialogOpen(false);
  };

  if (uiState.showTableControls) {
    // Show table editing controls when inside a table
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 w-8 p-0 transition-all duration-200 ease-in-out hover:bg-muted hover:scale-105 active:scale-95"
          >
            <Grid3X3 className="h-3.5 w-3.5 transition-transform duration-200" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={editorActions.addColumnBefore}>
                Before
              </DropdownMenuItem>
              <DropdownMenuItem onClick={editorActions.addColumnAfter}>
                After
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={editorActions.addRowBefore}>
                Above
              </DropdownMenuItem>
              <DropdownMenuItem onClick={editorActions.addRowAfter}>
                Below
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={editorActions.deleteTable}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Show table insertion controls when not in a table
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 w-8 p-0 transition-all duration-200 ease-in-out hover:bg-muted hover:scale-105 active:scale-95"
            aria-label="Insert table"
          >
            <TableIcon className="h-3.5 w-3.5 transition-transform duration-200" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleInsertTable}>
            <Grid3X3 className="h-4 w-4 mr-2" />
            Insert 3×4 Table
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setInsertDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Custom Size...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={insertDialogOpen} onOpenChange={setInsertDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rows">Rows</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRows(Math.max(1, rows - 1))}
                    disabled={rows <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    id="rows"
                    type="number"
                    min="1"
                    max="20"
                    value={rows}
                    onChange={(e) => setRows(parseInt(e.target.value, 10) || 1)}
                    className="w-16 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRows(Math.min(20, rows + 1))}
                    disabled={rows >= 20}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cols">Columns</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCols(Math.max(1, cols - 1))}
                    disabled={cols <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    id="cols"
                    type="number"
                    min="1"
                    max="10"
                    value={cols}
                    onChange={(e) => setCols(parseInt(e.target.value, 10) || 1)}
                    className="w-16 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCols(Math.min(10, cols + 1))}
                    disabled={cols >= 10}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setInsertDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleInsertCustomTable}>Insert Table</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
