/**
 * Utility functions to transform data between backend and frontend formats
 */

import type {
  IBackendUser,
  IUser,
  IUserProfile,
  IUserSubscription,
} from "../core/user";

/**
 * Transform backend user to frontend user format
 */
export function transformBackendUserToUser(
  backendUser: IBackendUser,
): IUser & { [x: string]: any } {
  return {
    ...backendUser,
    id: backendUser.id, // Already a string from Go service
    displayName: backendUser.name,
    email: backendUser.email,
    photoURL: null, // Backend doesn't have avatar/photo yet
    "@meta": {
      isPremium: backendUser.subscription.plan !== "free",
      plan: backendUser.subscription.plan,
    },
    tenant_id: backendUser.tenant_id,
  };
}

/**
 * Transform backend subscription to frontend subscription format
 */
export function transformBackendSubscription(
  backendSub: IBackendUser["subscription"],
): IUserSubscription {
  return {
    plan: backendSub.plan,
    status: backendSub.status,
    expiresAt: backendSub.expires_at || null, // Already ISO string from Go service
    createdAt: backendSub.created_at, // Already ISO string from Go service
    updatedAt: backendSub.updated_at, // Already ISO string from Go service
  };
}

/**
 * Transform backend user to frontend user profile format
 */
export function transformBackendUserToUserProfile(
  backendUser: IBackendUser,
): IUserProfile {
  const baseUser = transformBackendUserToUser(backendUser);

  return {
    ...baseUser,
    emailVerified: backendUser.email_verified,
    authMethods: backendUser.auth_methods,
    createdAt: backendUser.created_at, // Already ISO string from Go service
    updatedAt: backendUser.updated_at, // Already ISO string from Go service
    lastLoginAt: backendUser.last_login_at, // Already ISO string from Go service
    subscription: transformBackendSubscription(backendUser.subscription),
    // Optional fields not yet in backend
    preferences: undefined,
    stats: undefined,
    organization: undefined,
  };
}

/**
 * Extract MongoDB ObjectId string from backend ID format
 */
export function extractObjectId(id: { $oid: string } | string): string {
  if (typeof id === "string") return id;
  return id.$oid;
}

/**
 * Extract date string from MongoDB date format
 */
export function extractDateString(date: { $date: string } | string): string {
  if (typeof date === "string") return date;
  return date.$date;
}
