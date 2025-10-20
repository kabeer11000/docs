// cloudstore.ts
import { $auth } from "@/state/auth";

// Only import cloudstore on the client
let CloudStore: any = null;
let Adapters: any = null;

// Lazy-loaded instance
let cloudStore: any = null;

// Track auth state to avoid unnecessary reinitializations
let previousAuthState = {
  isAuthenticated: false,
  accessToken: undefined as string | undefined,
};

// Lazy initializer
function ensureCloudStoreIsLoaded() {
  if (typeof window === "undefined") return; // 🛑 SSR guard

  if (!CloudStore || !Adapters) {
    // Dynamically import only on client
    const cl = require("cloudstore");
    CloudStore = cl.default;
    Adapters = cl.Adapters;
  }
}

function createCloudStore(accessToken?: string, tenant_id?: string): any {
  if (typeof window === "undefined") return null;
  ensureCloudStoreIsLoaded();
  if (!CloudStore || !accessToken || !tenant_id) {
    console.log("CloudStore: Skipping initialization - missing credentials");
    return null;
  }

  const CLOUDSTORE_CONFIG = {
    URI: "http://localhost:5000",
    DATABASE_NAME: "kabeers-docs-cl",
  };

  const instance = new CloudStore({
    server: {
      uri: CLOUDSTORE_CONFIG.URI,
      access: {
        key: accessToken,
        tenant_id: tenant_id,
      },
      config: {
        upgradeToBackgroundSync: true,
      },
    },
    lifecycle: {
      onConfigCallback: () => console.log("CL Config Callback"),
      onOpenConnection: () => {
        console.log("cloudstore.connect()", window);
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

  instance.connect();
  return instance;
}

// Reinitialize when auth changes — but only on client
function setupAuthListener() {
  if (typeof window === "undefined") return;

  $auth.subscribe((authState) => {
    const currentAccessToken = authState.tokens?.accessToken;
    const isAuthStatusChanged =
      previousAuthState.isAuthenticated !== authState.isAuthenticated;
    const isTokenChanged = previousAuthState.accessToken !== currentAccessToken;

    console.log("CloudStore: Auth subscription triggered", {
      previous: {
        isAuthenticated: previousAuthState.isAuthenticated,
        hasToken: !!previousAuthState.accessToken,
      },
      current: {
        isAuthenticated: authState.isAuthenticated,
        hasTokens: !!authState.tokens,
        hasUser: !!authState.user,
        tokenPreview: currentAccessToken?.substring(0, 20),
      },
      changes: { statusChanged: isAuthStatusChanged, tokenChanged: isTokenChanged },
    });

    if (isAuthStatusChanged || isTokenChanged) {
      console.log("CloudStore: Reinitializing due to auth change");

      if (cloudStore) {
        try {
          cloudStore.destroy();
        } catch (error) {
          console.warn("CloudStore: Error destroying instance", error);
        }
      }

      cloudStore = createCloudStore(
        authState.tokens?.accessToken,
        authState.user?.tenant_id
      );

      previousAuthState = {
        isAuthenticated: authState.isAuthenticated,
        accessToken: currentAccessToken,
      };
    }
  });
}

// 👇 This is key: don't run setup immediately!
// Instead, defer to first access or manual init
let authListenerSetup = false;

function ensureInitialized() {
  if (typeof window === "undefined") return;
  ensureCloudStoreIsLoaded();
  if (!authListenerSetup) {
    setupAuthListener();
    authListenerSetup = true;
  }
}

// Proxy that lazily initializes on first access (client-only)
const cloudStoreProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      ensureInitialized(); // safe: no-op on server
      if (!cloudStore) return undefined;
      const value = cloudStore[prop];
      return typeof value === "function" ? value.bind(cloudStore) : value;
    },
    has(_target, prop) {
      ensureInitialized();
      return cloudStore ? prop in cloudStore : false;
    },
    ownKeys(_target) {
      ensureInitialized();
      return cloudStore ? Reflect.ownKeys(cloudStore) : [];
    },
    getOwnPropertyDescriptor(_target, prop) {
      ensureInitialized();
      return cloudStore
        ? Reflect.getOwnPropertyDescriptor(cloudStore, prop)
        : undefined;
    },
  }
);

export default cloudStoreProxy;