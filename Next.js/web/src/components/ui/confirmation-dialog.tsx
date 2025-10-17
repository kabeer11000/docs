import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {isLoading ? "Loading..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Specific confirmation dialogs for common actions
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  itemName,
  itemType = "item",
  onConfirm,
  isLoading = false,
  count,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName?: string;
  itemType?: "file" | "folder" | "item";
  onConfirm: () => void;
  isLoading?: boolean;
  count?: number;
}) {
  const isBulk = count && count > 1;
  const title = isBulk ? `Delete ${count} items` : `Delete ${itemType}`;
  const description = isBulk
    ? `Are you sure you want to delete ${count} items? This action cannot be undone.`
    : `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText="Delete"
      variant="destructive"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

export function MoveConfirmationDialog({
  open,
  onOpenChange,
  itemName,
  destination,
  itemType = "item",
  onConfirm,
  isLoading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  destination: string;
  itemType?: "file" | "folder" | "item";
  onConfirm: () => void;
  isLoading?: boolean;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Move ${itemType}`}
      description={`Move "${itemName}" to "${destination}"?`}
      confirmText="Move"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

export function RenameDialog({
  open,
  onOpenChange,
  itemName,
  itemType = "item",
  onConfirm,
  isLoading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType?: "file" | "folder" | "item";
  onConfirm: (newName: string) => void;
  isLoading?: boolean;
}) {
  const [newName, setNewName] = React.useState(itemName);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setNewName(itemName);
      // Small delay to ensure the dialog is fully rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [open, itemName]);

  const handleConfirm = () => {
    const trimmedName = newName.trim();
    if (trimmedName && trimmedName !== itemName) {
      onConfirm(trimmedName);
    } else {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setNewName(itemName); // Reset to original name
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle>Rename {itemType}</DialogTitle>
          <DialogDescription>
            Enter a new name for "{itemName}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
            placeholder={`Enter ${itemType} name`}
            autoFocus
            disabled={isLoading}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isLoading || !newName.trim() || newName.trim() === itemName
            }
          >
            {isLoading ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
