import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { useMemo } from "react";
import { $auth } from "@/state/auth";

export type UserAccessLevel = "owner" | "editor" | "viewer" | "signer" | null;

export interface DocumentPermissions {
  canEdit: boolean;
  canRename: boolean;
  canShare: boolean;
  canDelete: boolean;
  canDownload: boolean;
  canComment: boolean;
  canSign: boolean;
  accessLevel: UserAccessLevel;
}

export function useDocumentPermissions(
  document: Document | null,
): DocumentPermissions {
  const { user } = useStore($auth);

  return useMemo(() => {
    if (!document || !user) {
      return {
        canEdit: false,
        canRename: false,
        canShare: false,
        canDelete: false,
        canDownload: false,
        canComment: false,
        canSign: false,
        accessLevel: null,
      };
    }

    const isOwner = document.owner === user.id;

    if (isOwner) {
      return {
        canEdit: true,
        canRename: true,
        canShare: true,
        canDelete: true,
        canDownload: true,
        canComment: true,
        canSign: true,
        accessLevel: "owner",
      };
    }

    const sharedAccess = document.sharing?.sharedWith?.find(
      (s) =>
        s.status === "active" &&
        (s.userId === user.id || s.email === user.email),
    );

    if (!sharedAccess) {
      return {
        canEdit: false,
        canRename: false,
        canShare: false,
        canDelete: false,
        canDownload: false,
        canComment: false,
        canSign: false,
        accessLevel: null,
      };
    }

    switch (sharedAccess.access) {
      case "editor":
        return {
          canEdit: true,
          canRename: false,
          canShare: false,
          canDelete: false,
          canDownload: true,
          canComment: true,
          canSign: false,
          accessLevel: "editor",
        };

      case "viewer":
        return {
          canEdit: false,
          canRename: false,
          canShare: false,
          canDelete: false,
          canDownload: true,
          canComment: true,
          canSign: false,
          accessLevel: "viewer",
        };

      case "signer":
        return {
          canEdit: false,
          canRename: false,
          canShare: false,
          canDelete: false,
          canDownload: true,
          canComment: false,
          canSign: true,
          accessLevel: "signer",
        };

      default:
        return {
          canEdit: false,
          canRename: false,
          canShare: false,
          canDelete: false,
          canDownload: false,
          canComment: false,
          canSign: false,
          accessLevel: null,
        };
    }
  }, [document, user]);
}
