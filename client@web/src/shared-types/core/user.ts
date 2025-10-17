/**
 * Core User types - shared across all services
 * These types should match the backend auth service definitions
 */

// Backend subscription structure from Go service (JSON response)
// Matches models.Subscription struct exactly with Go JSON tags
export interface IBackendSubscription {
  plan: "free" | "pro" | "enterprise"; // PlanType enum
  status: string;
  expires_at?: string | null; // *time.Time as RFC3339 string or null
  created_at: string; // time.Time as RFC3339 string
  updated_at: string; // time.Time as RFC3339 string
}

// Backend user structure from Go authentication service (JSON response)
// Matches models.User struct exactly with Go JSON tags
export interface IBackendUser {
  id: string; // primitive.ObjectID serialized as string
  email: string;
  name: string;
  auth_methods: string[]; // []AuthMethod serialized as string array
  google_id?: string; // Optional Google ID
  tenant_id: string; // Tenant_id Added in #5c1e5b8
  credentials?: any[]; // WebAuthn credentials (omitted for security)
  email_verified: boolean; // Snake_case from Go JSON tag
  subscription: IBackendSubscription;
  created_at: string; // time.Time serialized as RFC3339 string
  updated_at: string; // time.Time serialized as RFC3339 string
  last_login_at?: string; // *time.Time serialized as RFC3339 string or null
}

// Raw MongoDB user structure (for reference, not used in API responses)
export interface IMongoUser {
  _id: { $oid: string };
  email: string;
  name: string;
  password_hash?: string;
  auth_methods: string[];
  email_verified: boolean;
  tenant_id: string;
  subscription: {
    plan: "free" | "pro" | "enterprise";
    status: string;
    expires_at?: { $date: string } | null;
    created_at: { $date: string };
    updated_at: { $date: string };
  };
  created_at: { $date: string };
  updated_at: { $date: string };
  last_login_at?: { $date: string };
}

// Frontend user interface - transformed from backend
export interface IUser {
  id: string;
  tenant_id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  "@meta": {
    isPremium: boolean;
    plan: "free" | "pro" | "enterprise";
  };
}

// Extended user profile with backend fields
export interface IUserProfile extends IUser {
  emailVerified: boolean;
  authMethods: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  tenant_id: string;
  subscription: IUserSubscription;
  preferences?: IUserPreferences;
  stats?: IUserStats;
  organization?: IUserOrganization;
}

export interface IUserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
  };
}

export interface IUserStats {
  filesCreated: number;
  foldersCreated: number;
  storageUsed: number;
  storageLimit: number;
  lastLogin: string;
}

export interface IUserOrganization {
  name: string;
  role: string;
  members: number;
}

export interface IUserSubscription {
  plan: "free" | "pro" | "enterprise";
  status: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IUserPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare?: boolean;
  canAdmin?: boolean;
}

export interface ISharedWithItem {
  id: string;
  access: "viewer" | "editor" | "admin";
}
