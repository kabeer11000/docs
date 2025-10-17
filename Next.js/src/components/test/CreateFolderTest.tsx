import { useStore } from "@nanostores/react";
import { useFolders } from "@repo/shadcn-ui/hooks/use-folders";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import cloudStore from "@/lib/cloudstore";
import { $auth } from "@/state/auth";

export function CreateFolderTest() {
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useStore($auth);
  const { folders } = useFolders(undefined);

  const handleCreateFolder = async () => {
    if (!folderName.trim() || !cloudStore || !user) return;

    setIsCreating(true);
    setError(null);

    try {
      const foldersCollection = cloudStore.collection("folders");
      await foldersCollection.add({
        name: folderName.trim(),
        parent: user.id,
        tags: [],
        category: "general",
        parents: [user.id],
        permissions: {
          owner: user.id,
          viewers: [],
          editors: [],
        },
        meta: {
          fileCount: 0,
          color: "#3b82f6",
        },
        timestamp: {
          createdAt: Date.now(),
          modifiedAt: Date.now(),
        },
      });
      setFolderName("");
      alert(`Folder "${folderName}" created successfully!`);
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      alert(`Failed to create folder: ${errorMsg}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
      <h3 className="font-semibold mb-3">
        Create New Folder (CloudStore Test)
      </h3>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter folder name..."
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleCreateFolder()}
          className="flex-1"
        />
        <Button
          onClick={handleCreateFolder}
          disabled={!folderName.trim() || isCreating}
        >
          {isCreating ? "Creating..." : "Create Folder"}
        </Button>
      </div>

      {error && <p className="text-red-600 text-sm mt-2">Error: {error}</p>}

      <p className="text-sm text-gray-600 mt-2">
        ✨ This will create a folder in CloudStore database in real-time!
      </p>
    </div>
  );
}
