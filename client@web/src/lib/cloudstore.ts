import * as cl from "cloudstore";
import { $auth } from "@/state/auth";

const { default: CloudStore, Adapters } = cl;
let cloudStore: typeof CloudStore | null = null;
console.log("cl: ", CloudStore);
// console.log('Adapters:', CloudStore, Adapters);
// Environment configuration
const CLOUDSTORE_CONFIG = {
  URI: "https://lxcloudstore.deployments.otherdev.com",
  DATABASE_NAME: "kabeers-docs-cl",
};

function createCloudStore(
  accessToken?: string,
  tenantId?: string,
): typeof CloudStore | null {
  if (!accessToken || !tenantId) {
    console.log("CloudStore: Skipping initialization - missing credentials");
    return null;
  }
  const cl = new CloudStore({
    server: {
      uri: CLOUDSTORE_CONFIG.URI,
      access: {
        key: accessToken || "",
        tenant_id: tenantId || "default",
      },
      config: {
        upgradeToBackgroundSync: true,
      },
    },
    cache: {
      storage: {
        adapter: new Adapters.IndexedDB(`cloudstore.lexa.collection:1`),
      },
    },
    database: {
      name: CLOUDSTORE_CONFIG.DATABASE_NAME,
    },
  });
  cl.connect();
  return cl;
}

function initializeCloudStore(): typeof CloudStore | null {
  const authState = $auth.get();

  if (cloudStore) {
    cloudStore.destroy();
  }

  cloudStore = createCloudStore(
    authState.tokens?.accessToken,
    authState.user?.tenant_id,
  );

  return cloudStore;
}

// Don't initialize immediately - wait for auth to be ready
cloudStore = null;

// Track previous auth state to avoid unnecessary reinitializations
let previousAuthState: { isAuthenticated: boolean; accessToken?: string } = {
  isAuthenticated: false,
  accessToken: undefined,
};

// Subscribe to auth changes
$auth.subscribe((authState) => {
  const currentAccessToken = authState.tokens?.accessToken;
  const isAuthStatusChanged =
    previousAuthState.isAuthenticated !== authState.isAuthenticated;
  const isTokenChanged = previousAuthState.accessToken !== currentAccessToken;

  console.log("CloudStore: Auth subscription triggered", {
    previous: {
      isAuthenticated: previousAuthState.isAuthenticated,
      hasToken: !!previousAuthState.accessToken,
      tokenPreview: previousAuthState.accessToken?.substring(0, 20),
    },
    current: {
      isAuthenticated: authState.isAuthenticated,
      hasTokens: !!authState.tokens,
      hasUser: !!authState.user,
      tokenPreview: currentAccessToken?.substring(0, 20),
      userId: authState.user?.id,
      userEmail: authState.user?.email,
    },
    changes: {
      statusChanged: isAuthStatusChanged,
      tokenChanged: isTokenChanged,
    },
  });

  // Only reinitialize if:
  // 1. User logged in/out (auth status changed), OR
  // 2. Access token changed (token refresh or new login)
  if (isAuthStatusChanged || isTokenChanged) {
    console.log("CloudStore: Reinitializing due to auth change");

    if (cloudStore) {
      console.log("CloudStore: Destroying previous instance");
      try {
        cloudStore.destroy();
      } catch (error) {
        console.warn("CloudStore: Error destroying instance", error);
      }
    }

    cloudStore = createCloudStore(
      authState.tokens?.accessToken,
      authState.user?.tenant_id,
    );

    console.log(
      "CloudStore: New instance created",
      cloudStore ? "SUCCESS" : "NULL",
    );

    // Update tracking
    previousAuthState = {
      isAuthenticated: authState.isAuthenticated,
      accessToken: currentAccessToken,
    };
  } else {
    console.log("CloudStore: No changes detected, skipping reinit");
  }
});

// Create a proxy that always returns the current cloudStore
const cloudStoreProxy = new Proxy({} as typeof CloudStore, {
  get(_target, prop, _receiver) {
    if (!cloudStore) {
      return undefined;
    }
    const value = cloudStore[prop];
    // Bind methods to the current cloudStore instance
    return typeof value === "function" ? value.bind(cloudStore) : value;
  },

  has(_target, prop) {
    return cloudStore ? prop in cloudStore : false;
  },

  ownKeys(_target) {
    return cloudStore ? Reflect.ownKeys(cloudStore) : [];
  },

  getOwnPropertyDescriptor(_target, prop) {
    return cloudStore
      ? Reflect.getOwnPropertyDescriptor(cloudStore, prop)
      : undefined;
  },
});

export default cloudStoreProxy;
export { initializeCloudStore };
