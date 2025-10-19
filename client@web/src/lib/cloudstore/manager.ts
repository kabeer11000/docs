import * as cl from "cloudstore";
import { $auth } from "@/lib/auth/manager";
import { showToast } from "@/lib/toast";

const { default: CloudStore, Adapters } = cl;

class CloudStoreManager {
  private instance: typeof CloudStore | null = null;
  private watchers = new Map<string, any>();
  private connectionPromise: Promise<void> | null = null; // ✅ Prevents race conditions
  private currentAccessToken: string | null = null;
  private currentTenantId: string | null = null;

  async connect(accessToken: string, tenantId: string): Promise<typeof CloudStore | null> {
    // ✅ FIX: Prevent overlapping connect/disconnect
    if (this.connectionPromise) {
      await this.connectionPromise;
    }

    // Skip if already connected with same credentials
    if (
      this.instance &&
      this.currentAccessToken === accessToken &&
      this.currentTenantId === tenantId
    ) {
      return this.instance;
    }

    this.connectionPromise = this._doConnect(accessToken, tenantId);
    try {
      await this.connectionPromise;
      return this.instance;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async _doConnect(accessToken: string, tenantId: string): Promise<void> {
    try {
      // Disconnect previous instance
      await this.disconnect();

      this.instance = new CloudStore({
        server: {
          uri: process.env.NEXT_PUBLIC_CLOUDSTORE_URI || "https://lxcloudstore.deployments.otherdev.com",
          access: { key: accessToken, tenant_id: tenantId },
          config: { upgradeToBackgroundSync: true },
        },
        cache: {
          storage: {
            adapter: new Adapters.IndexedDB("cloudstore.lexa.collection:1"),
          },
        },
        database: {
          name: process.env.NEXT_PUBLIC_CLOUDSTORE_DB || "kabeers-docs-cl",
        },
      });

      await this.instance.connect();

      this.currentAccessToken = accessToken;
      this.currentTenantId = tenantId;

      if (process.env.NODE_ENV === "development") {
        console.log("[CloudStore] Connected successfully");
      }
    } catch (error) {
      console.error("[CloudStore] Connection failed:", error);
      showToast.error("Database Connection Failed", "Retrying..."); // ✅ Toast
      this.instance = null;
      this.currentAccessToken = null;
      this.currentTenantId = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopAllWatchers();

    if (this.instance) {
      try {
        await this.instance.destroy();
      } catch (error) {
        console.warn("[CloudStore] Disconnect error:", error);
      }
      this.instance = null;
      this.currentAccessToken = null;
      this.currentTenantId = null;
    }
  }

  get(): typeof CloudStore | null {
    return this.instance;
  }

  // Watcher registry for debugging and cleanup
  registerWatcher(id: string, watcher: any): void {
    this.stopWatcher(id);
    this.watchers.set(id, watcher);

    if (process.env.NODE_ENV === "development") {
      console.log(`[CloudStore] Watcher registered: ${id}`);
    }
  }

  stopWatcher(id: string): void {
    const watcher = this.watchers.get(id);
    if (watcher && typeof watcher.stop === "function") {
      watcher.stop();
      this.watchers.delete(id);

      if (process.env.NODE_ENV === "development") {
        console.log(`[CloudStore] Watcher stopped: ${id}`);
      }
    }
  }

  stopAllWatchers(): void {
    if (process.env.NODE_ENV === "development") {
      console.log(`[CloudStore] Stopping ${this.watchers.size} watchers`);
    }

    for (const [id] of this.watchers) {
      this.stopWatcher(id);
    }
  }
}

export const cloudStoreManager = new CloudStoreManager();

// Subscribe to auth changes
$auth.subscribe(async (authState) => {
  if (authState.isAuthenticated && authState.tokens && authState.user) {
    try {
      await cloudStoreManager.connect(
        authState.tokens.accessToken,
        authState.user.tenant_id
      );
    } catch (error) {
      console.error("[CloudStore] Failed to connect on auth change:", error);
    }
  } else {
    await cloudStoreManager.disconnect();
  }
});

// Export instance getter for backwards compatibility
export default {
  get collection() {
    return cloudStoreManager.get()?.collection.bind(cloudStoreManager.get());
  },
  get query() {
    return cloudStoreManager.get()?.query;
  },
  // Add other CloudStore methods as needed
};