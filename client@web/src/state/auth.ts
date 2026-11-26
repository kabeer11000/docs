import type { IAuthTokens, IUser } from "@shared-types";
import type { WritableAtom } from "nanostores";
import { authManager } from "@/lib/auth/manager";
import { clientCookies } from "@/lib/auth/cookies";
import { authService } from "@/services/auth.service";

interface AuthState {
  isAuthenticated: boolean;
  user: IUser | null;
  tokens: IAuthTokens | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  loginForm: { email: ""; password: ""; tenant_id: "1234" };
  onboardForm: {
    displayName: "";
    email: "";
    tenant_id: "1234",
    password: "";
    confirmPassword: "";
  };
}

// Single source of truth: the session lives in authManager; this module keeps the
// form-driven login/sign-up API that components already use.
export const $auth = authManager.$state as unknown as WritableAtom<AuthState>;

function saveAuth(user: IUser, tokens: IAuthTokens): void {
  authManager.adoptSession(user, tokens);
}

function clearAuth(): void {
  authManager.endSession();
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
      
      console.log(response);
      saveAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
      });
      return true;
    } catch (error) {
      console.log(error);
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
        tenant_id: userData.tenant_id,
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
    void authManager.init();
  },

  clearError(): void {
    $auth.set({ ...$auth.get(), error: null });
  },

  cleanup(): void {
    authManager.cleanup();
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

  refreshToken(): Promise<boolean> {
    return authManager.refreshToken();
  },
};
