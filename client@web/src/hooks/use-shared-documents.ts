import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import { $nothing, sharedDocumentsWatch } from "@/state/live-queries";
import { $auth } from "../state/auth";
import { sameEmail } from "@/lib/email";

/** Documents other people shared with the current user (one shared, cached watch). */
export function useSharedDocuments() {
  const { user } = useStore($auth);
  const rows = useStore(user ? sharedDocumentsWatch(user.id) : $nothing);

  const documents = useMemo(() => {
    if (!user || !rows) return [];
    return rows.filter(
      (doc) =>
        doc.owner !== user.id &&
        doc.sharing?.sharedWith?.some(
          (shared) =>
            shared.status === "active" &&
            ((shared.userId && shared.userId === user.id) ||
              sameEmail(shared.email, user.email)),
        ),
    );
  }, [rows, user]);

  return { documents, isLoading: !!user && rows === undefined };
}
