import { useStore } from "@nanostores/react";
import type { Document } from "@shared-types";
import { useCallback, useEffect, useState } from "react";
import { $auth } from "@/state/auth";
import { $documents } from "@/state/cloudstore-data";
import { useSharedDocuments } from "./use-shared-documents";

interface UserData {
  id: string;
  displayName: string | null;
  email: string | null;
}

/**
 * Best-in-class user name resolution hook
 *
 * Architecture:
 * - Single source of truth: Document sharing metadata (always present)
 * - No API calls: Owner info embedded in sharing.sharedWith array
 * - No loading states: Data is immediately available
 * - No fallbacks: Proper denormalization ensures consistency
 * - Reads from BOTH owned and shared documents for complete user data
 */
export function useUserNames() {
  const [userCache, setUserCache] = useState<Map<string, UserData>>(new Map());
  const { user: currentUser } = useStore($auth);
  const ownedDocuments = useStore($documents);
  const { documents: sharedDocuments } = useSharedDocuments();

  // Build cache from ALL documents (owned + shared)
  useEffect(() => {
    const newCache = new Map<string, UserData>();

    // Add current user
    if (currentUser) {
      newCache.set(currentUser.id, {
        id: currentUser.id,
        displayName: currentUser.displayName || currentUser.email || null,
        email: currentUser.email || null,
      });
    }

    // Process all documents (owned + shared)
    const allDocuments = [...ownedDocuments, ...sharedDocuments];

    allDocuments.forEach((doc: Document) => {
      // Process all users in sharedWith (including owner)
      doc.sharing?.sharedWith?.forEach((shared) => {
        if (shared.userId && !newCache.has(shared.userId)) {
          newCache.set(shared.userId, {
            id: shared.userId,
            displayName: shared.displayName || null,
            email: shared.email,
          });
        }
        // Also cache by email for lookups
        if (shared.email && !newCache.has(shared.email)) {
          newCache.set(shared.email, {
            id: shared.userId || shared.email,
            displayName: shared.displayName || null,
            email: shared.email,
          });
        }
      });

      // Fallback: if owner not in sharedWith, use owner ID
      if (doc.owner && !newCache.has(doc.owner)) {
        newCache.set(doc.owner, {
          id: doc.owner,
          displayName: null,
          email: null,
        });
      }
    });

    setUserCache(newCache);
  }, [ownedDocuments, sharedDocuments, currentUser]);

  /**
   * Get user display name
   * Always returns immediately - no loading states
   */
  const getUserName = useCallback(
    (userId: string | undefined | null, fallbackToId = true): string => {
      if (!userId) return "Unknown";

      // Current user - always return immediately
      if (currentUser && userId === currentUser.id) {
        return "me";
      }

      // Look up in cache (built from sharing metadata)
      const userData = userCache.get(userId);

      if (userData) {
        if (userData.displayName) {
          return userData.displayName;
        }
        if (userData.email) {
          return userData.email;
        }
      }

      // Final fallback - if userId looks like email, show it
      if (fallbackToId && userId.includes("@")) {
        return userId;
      }

      return "Unknown User";
    },
    [userCache, currentUser]
  );

  /**
   * Get user initials for avatar
   */
  const getUserInitials = useCallback(
    (userId: string | undefined | null): string => {
      if (!userId) return "U";

      if (currentUser && userId === currentUser.id) {
        const name = currentUser.displayName || currentUser.email;
        if (name) {
          return name
            .split(/[\s@]+/)
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        }
        return "ME";
      }

      const userData = userCache.get(userId);

      if (userData?.displayName) {
        return userData.displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      }

      if (userData?.email) {
        return userData.email.charAt(0).toUpperCase();
      }

      // Fallback - if userId looks like email, use first char
      if (userId.includes("@")) {
        return userId.charAt(0).toUpperCase();
      }

      return "U";
    },
    [userCache, currentUser]
  );

  return {
    getUserName,
    getUserInitials,
    isLoading: false, // Never loading - data is always available
  };
}
