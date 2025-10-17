import { useSharedFolders } from "./use-shared-folders";

export function useLocationNames() {
  const { getLocationName } = useSharedFolders();
  return { getLocationName };
}
