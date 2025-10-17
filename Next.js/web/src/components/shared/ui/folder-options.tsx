import { MoreVertical, Palette, Settings, Share, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderOptionsProps {
  folderId?: string;
}

export function FolderOptions({ folderId }: FolderOptionsProps) {
  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const shareUrl = `${window.location.origin}/folder/${folderId}/share`;
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => alert(`Share link copied to clipboard!`))
        .catch(() => alert("Failed to copy share link"));
    } else {
      alert("Clipboard not supported");
    }
  };

  const handleChangeCategory = () => {
    // TODO: Implement category change modal
    alert("Category change coming soon!");
  };

  const handleManageSharing = () => {
    // TODO: Implement sharing management modal
    alert("Sharing management coming soon!");
  };

  const handleFolderSettings = () => {
    // TODO: Implement folder settings modal
    alert("Folder settings coming soon!");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="backdrop-blur-sm py-4 inline-flex items-center justify-center duration-150 gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-10 px-6 has-[>svg]:px-4 rounded-full border"
        >
          <MoreVertical className="w-4 h-4" />
          <span className="hidden sm:inline">Options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleShare}>
          <Share className="mr-2 h-4 w-4" />
          Share folder
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleManageSharing}>
          <Users className="mr-2 h-4 w-4" />
          Manage sharing
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleChangeCategory}>
          <Palette className="mr-2 h-4 w-4" />
          Change category
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleFolderSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Folder settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
