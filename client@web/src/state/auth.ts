import type { IAuthTokens, IUser } from "@shared-types";
import { atom } from "nanostores";
import { clientCookies } from "@/lib/auth/cookies";
import { authService } from "@/services/auth.service";

interface AuthState {
  isAuthenticated: boolean;
  user: IUser | null;
  tokens: IAuthTokens | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  loginForm: { email: ""; password: "" };
  onboardForm: {
    displayName: "";
    email: "";
    password: "";
    confirmPassword: "";
  };
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  tokens: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  loginForm: { email: "", password: "" },
  onboardForm: {
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  },
};

export const $auth = atom<AuthState>(initialState);

function saveAuth(user: IUser, tokens: IAuthTokens): void {
  const currentState = $auth.get();

  // Avoid unnecessary state updates if nothing changed
  if (
    currentState.isAuthenticated &&
    currentState.user?.id === user.id &&
    currentState.tokens?.accessToken === tokens.accessToken
  ) {
    console.log("Auth: State unchanged, skipping update");
    return;
  }

  console.log("Auth: Saving auth state for user:", user.email);

  $auth.set({
    ...currentState,
    user,
    tokens,
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    error: null,
  });
  clientCookies.setAuthCookies(tokens, user);
  startTokenRefreshTimer();
}

function clearAuth(): void {
  console.log("Auth: Clearing auth state");
  console.trace("Auth: clearAuth stack trace");
  $auth.set(initialState);
  clientCookies.clearAuthCookies();
  stopTokenRefreshTimer();
}

export function getAuthHeader(): string | null {
  const state = $auth.get();
  return state.tokens
    ? `${state.tokens.tokenType} ${state.tokens.accessToken}`
    : null;
}

export function getUserInitials(user: IUser | null): string | null {
  if (!user?.displayName) return null;
  return user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function isTokenNearExpiry(tokens: IAuthTokens): boolean {
  const payload = authService.decodeToken(tokens.accessToken);
  if (!payload?.exp) return true;

  const now = Date.now() / 1000;
  const fiveMinutes = 5 * 60; // 5 minutes

  return payload.exp - now < fiveMinutes;
}

let tokenRefreshTimer: NodeJS.Timeout | null = null;
let visibilityChangeHandler: (() => Promise<void>) | null = null;

function startTokenRefreshTimer(): void {
  stopTokenRefreshTimer();

  const authState = $auth.get();
  if (!authState.tokens) return;

  // Calculate when token will expire
  const payload = authService.decodeToken(authState.tokens.accessToken);
  if (!payload?.exp) return;

  const now = Date.now() / 1000;
  const fiveMinutesBeforeExpiry = 5 * 60; // Refresh 5 minutes before expiry
  const secondsUntilRefresh = payload.exp - now - fiveMinutesBeforeExpiry;

  // Only set timer if token needs refresh in the future
  if (secondsUntilRefresh > 0) {
    console.log(
      `Token refresh scheduled in ${Math.round(secondsUntilRefresh / 60)} minutes`,
    );

    // Set single timeout to refresh at the right time
    tokenRefreshTimer = setTimeout(async () => {
      console.log("Token near expiry, refreshing proactively...");
      try {
        await auth.refreshToken();
        // After refresh, schedule the next refresh
        startTokenRefreshTimer();
      } catch (error) {
        console.warn("Proactive token refresh failed:", error);
      }
    }, secondsUntilRefresh * 1000);
  } else {
    // Token expires soon, refresh immediately
    console.log("Token near expiry, refreshing immediately...");
    auth.refreshToken().catch((error) => {
      console.warn("Immediate token refresh failed:", error);
    });
  }

  // Handle page visibility changes (check if refresh needed when page becomes visible)
  if (typeof document !== "undefined") {
    visibilityChangeHandler = async () => {
      if (!document.hidden) {
        const authState = $auth.get();
        if (
          authState.isAuthenticated &&
          authState.tokens &&
          isTokenNearExpiry(authState.tokens)
        ) {
          console.log(
            "Page visible and token near expiry, refreshing immediately...",
          );
          try {
            await auth.refreshToken();
          } catch (error) {
            console.warn("Visibility-triggered token refresh failed:", error);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", visibilityChangeHandler);
  }
}

function stopTokenRefreshTimer(): void {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }

  if (visibilityChangeHandler && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visibilityChangeHandler);
    visibilityChangeHandler = null;
  }
}

export const auth = {
  handleLoginFormChange(field: string, value: string) {
    const state = $auth.get();
    $auth.set({
      ...state,
      loginForm: {
        ...state.loginForm,
        [field]: value,
      },
    });
  },

  handleOnboardFormChange(field: string, value: string) {
    const state = $auth.get();
    $auth.set({
      ...state,
      onboardForm: {
        ...state.onboardForm,
        [field]: value,
      },
    });
  },

  async login(): Promise<boolean> {
    const credentials = $auth.get().loginForm;
    $auth.set({ ...$auth.get(), isLoading: true, error: null });

    try {
      const response = await authService.login(credentials);
      saveAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
      });
      return true;
    } catch (error) {
      $auth.set({
        ...$auth.get(),
        error: error instanceof Error ? error.message : "Login failed",
        isLoading: false,
      });
      return false;
    }
  },

  async signUp(): Promise<boolean> {
    const userData = $auth.get().onboardForm;
    if (userData.password !== userData.confirmPassword) {
      $auth.set({ ...$auth.get(), error: "Passwords do not match" });
      return false;
    }

    $auth.set({ ...$auth.get(), isLoading: true, error: null });

    try {
      const response = await authService.register({
        name: userData.displayName,
        email: userData.email,
        password: userData.password,
      });
      saveAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
      });
      return true;
    } catch (error) {
      $auth.set({
        ...$auth.get(),
        error: error instanceof Error ? error.message : "Sign up failed",
        isLoading: false,
      });
      return false;
    }
  },

  async logout(): Promise<void> {
    const tokens = $auth.get().tokens;
    if (tokens) {
      try {
        await authService.logout(tokens.accessToken);
      } catch (error) {
        console.error("Logout request failed:", error);
      }
    }
    clearAuth();
  },

  init(): void {
    try {
      const currentState = $auth.get();

      // If already loading, skip to prevent race conditions
      if (currentState.isLoading) {
        console.log("Auth: Already initializing, skipping");
        return;
      }

      const { tokens, user } = clientCookies.getAuthFromCookies();

      // If already authenticated with the same tokens, skip
      if (
        currentState.isAuthenticated &&
        currentState.user?.id === user?.id &&
        currentState.tokens?.accessToken === tokens?.accessToken
      ) {
        console.log(
          "Auth: Already initialized with same credentials, skipping",
        );
        return;
      }

      // Set loading state during initialization
      $auth.set({ ...currentState, isLoading: true });

      if (tokens && user && !authService.isTokenExpired(tokens.accessToken)) {
        console.log("Auth: Initializing with valid tokens from cookies");
        saveAuth(user, tokens);
      } else {
        console.log("Auth: No valid tokens found, clearing cookies");
        clientCookies.clearAuthCookies();
        $auth.set({ ...initialState, isLoading: false, isInitialized: true });
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      clientCookies.clearAuthCookies();
      $auth.set({ ...initialState, isLoading: false, isInitialized: true });
    }
  },

  clearError(): void {
    $auth.set({ ...$auth.get(), error: null });
  },

  cleanup(): void {
    stopTokenRefreshTimer();
  },

  async updateProfile(userData: Partial<IUser>): Promise<boolean> {
    const state = $auth.get();
    if (!state.isAuthenticated || !state.user) return false;

    $auth.set({ ...state, isLoading: true, error: null });

    try {
      // TODO: Implement authService.updateProfile
      // const updatedUser = await authService.updateProfile(userData);
      const updatedUser = { ...state.user, ...userData }; // Placeholder

      $auth.set({
        ...state,
        user: updatedUser,
        isLoading: false,
      });

      // Update cookies if necessary
      const tokens = state.tokens;
      if (tokens) {
        clientCookies.setAuthCookies(tokens, updatedUser);
      }

      return true;
    } catch (error) {
      $auth.set({
        ...state,
        error: error instanceof Error ? error.message : "Profile update failed",
        isLoading: false,
      });
      return false;
    }
  },

  async refreshToken(): Promise<boolean> {
    const currentState = $auth.get();
    const tokens = currentState.tokens;
    const user = currentState.user;

    if (!tokens?.refreshToken || !user) return false;

    try {
      const response = await authService.refreshToken(tokens.refreshToken);
      saveAuth(user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
      });
      return true;
    } catch (_error) {
      clearAuth();
      return false;
    }
  },
};
