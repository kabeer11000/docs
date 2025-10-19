import { atom } from 'nanostores'
import { showToast } from '@/lib/toast'
import { AUTH_ENDPOINTS } from '@/lib/endpoints'
import { clientCookies } from './cookies'
import type { IAuthTokens, IUser } from '@shared-types'

interface AuthState {
  isAuthenticated: boolean
  user: IUser | null
  tokens: IAuthTokens | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  loginForm: { email: string; password: string }
  onboardForm: {
    displayName: string
    email: string
    tenant_id: string
    password: string
    confirmPassword: string
  }
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
    tenant_id: '1234',
    password: "",
    confirmPassword: "",
  },
}

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  name: string
  email: string
  password: string
  tenant_id: string
}

class HttpClient {
  private baseTimeout = 8000 // 8 seconds
  private maxRetries = 2

  async request<T>(
    url: string,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    const {
      timeout = this.baseTimeout,
      retries = this.maxRetries,
      ...fetchOptions
    } = options

    return this.requestWithRetry<T>(url, fetchOptions, timeout, retries)
  }

  private async requestWithRetry<T>(
    url: string,
    options: RequestInit,
    timeout: number,
    retries: number,
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        })

        clearTimeout(timeoutId)

        const data = await response.json()

        if (!response.ok) {
          throw new HttpError(
            data.message || `HTTP ${response.status}`,
            response.status,
            data.error || "request_failed",
          )
        }

        return data
      } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof HttpError) {
          // Don't retry client errors (4xx) or auth errors
          if (error.isClientError || error.isUnauthorized) {
            throw error
          }
        }

        // Only retry on network errors or server errors, and if we have retries left
        if (attempt < retries) {
          const delay = Math.min(1000 * 2 ** attempt, 5000) // Exponential backoff, max 5s
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // Final attempt failed, throw the error
        if (error instanceof HttpError) {
          throw error
        }

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            throw new HttpError("Request timeout", 408, "timeout")
          }
          throw new HttpError(error.message, 0, "network_error")
        }

        throw new HttpError("Unknown error occurred", 0, "unknown_error")
      }
    }

    throw new HttpError("Max retries exceeded", 0, "max_retries_exceeded")
  }

  async get<T>(
    url: string,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET" })
  }

  async post<T>(
    url: string,
    body?: any,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(
    url: string,
    body?: any,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(
    url: string,
    options: RequestInit & { timeout?: number; retries?: number } = {},
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "DELETE" })
  }
}

class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
  ) {
    super(message)
    this.name = "HttpError"
  }

  get isNetworkError() {
    return this.statusCode === 0
  }

  get isClientError() {
    return this.statusCode >= 400 && this.statusCode < 500
  }

  get isServerError() {
    return this.statusCode >= 500
  }

  get isTimeout() {
    return this.statusCode === 408
  }

  get isUnauthorized() {
    return this.statusCode === 401
  }

  get isForbidden() {
    return this.statusCode === 403
  }
}

class AuthService {
  private http = new HttpClient()

  async login(credentials: LoginRequest) {
    try {
      const response = await this.http.post(
        AUTH_ENDPOINTS.LOGIN,
        credentials,
        { timeout: 8000, retries: 0 }, // 8 seconds for auth requests, no retries (fail fast)
      )

      // Transform backend response to frontend format
      return {
        user: this.transformBackendUserToUser(response.user),
        accessToken: response.access_token, // Convert snake_case to camelCase
        refreshToken: response.refresh_token,
        idToken: response.id_token,
        expiresIn: response.expires_in,
        tokenType: response.token_type,
      }
    } catch (error) {
      if (error instanceof HttpError) {
        // Map common auth errors to user-friendly messages
        if (error.isUnauthorized) {
          throw new HttpError(
            "Invalid email or password",
            401,
            "invalid_credentials",
          )
        }
        if (error.errorCode === "auth_method_not_available") {
          throw new HttpError(
            "Password login is not enabled for this account",
            403,
            "auth_method_disabled",
          )
        }
      }
      throw error
    }
  }

  async register(userData: RegisterRequest) {
    try {
      const response = await this.http.post(
        AUTH_ENDPOINTS.REGISTER,
        userData,
        { timeout: 8000, retries: 0 }, // No retries for auth requests
      )

      // Transform backend response to frontend format
      return {
        user: this.transformBackendUserToUser(response.user),
        accessToken: response.access_token, // Convert snake_case to camelCase
        refreshToken: response.refresh_token,
        idToken: response.id_token,
        expiresIn: response.expires_in,
        tokenType: response.token_type,
      }
    } catch (error) {
      if (error instanceof HttpError) {
        // Map common registration errors
        if (error.errorCode === "user_exists") {
          throw new HttpError(
            "An account with this email already exists",
            409,
            "user_exists",
          )
        }
        if (error.errorCode === "validation_failed") {
          throw new HttpError(
            "Please check your input and try again",
            400,
            "validation_failed",
          )
        }
      }
      throw error
    }
  }

  async refreshToken(refreshToken: string) {
    const response = await this.http.post(
      AUTH_ENDPOINTS.REFRESH_TOKEN,
      { refresh_token: refreshToken }, // Send snake_case to match Go service
      { timeout: 8000, retries: 0 }, // No retries for token refresh
    )

    // Transform backend response to frontend format
    return {
      user: this.transformBackendUserToUser(response.user),
      accessToken: response.access_token, // Convert snake_case to camelCase
      refreshToken: response.refresh_token,
      idToken: response.id_token,
      expiresIn: response.expires_in,
      tokenType: response.token_type,
    }
  }

  async logout(accessToken: string): Promise<void> {
    try {
      await this.http.post(
        AUTH_ENDPOINTS.LOGOUT,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 5000, // Short timeout for logout
        },
      )
    } catch (error) {
      // Don't throw on logout errors - just log them
      console.warn("Logout request failed:", error)
    }
  }

  isTokenNearExpiry(tokens: IAuthTokens): boolean {
    const payload = this.decodeToken(tokens.accessToken)
    if (!payload?.exp) return true

    const now = Date.now() / 1000
    const twoMinutes = 2 * 60 // Reduced from 5 minutes to reduce refresh frequency

    return payload.exp - now < twoMinutes
  }

  decodeToken(token: string): any {
    try {
      const payload = token.split(".")[1]
      return JSON.parse(atob(payload))
    } catch {
      return null
    }
  }

  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token)
    if (!payload?.exp) return true

    const now = Date.now() / 1000
    return payload.exp < now
  }

  private transformBackendUserToUser(backendUser: any): IUser {
    // This is a simplified transformation - in reality, this would be imported from shared types
    return {
      id: backendUser.id || backendUser._id,
      email: backendUser.email,
      displayName: backendUser.name || backendUser.displayName,
      tenant_id: backendUser.tenant_id || '1234',
      createdAt: backendUser.createdAt || backendUser.created_at,
      avatar: backendUser.avatar || null,
      permissions: backendUser.permissions || [],
      role: backendUser.role || 'user',
      isActive: backendUser.isActive !== undefined ? backendUser.isActive : true,
    }
  }
}

export class AuthManager {
  private state = atom<AuthState>(initialState)
  private refreshTimer: NodeJS.Timeout | null = null
  private initPromise: Promise<void> | null = null // ✅ Prevents race conditions
  private authService = new AuthService()

  async init(): Promise<void> {
    // ✅ FIX: Prevent multiple simultaneous init calls
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this._doInit()
    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  private async _doInit(): Promise<void> {
    const current = this.state.get()
    if (current.isInitialized) return

    this.state.set({ ...current, isLoading: true })

    try {
      const { tokens, user } = clientCookies.getAuthFromCookies()

      if (tokens && user && !this.isTokenExpired(tokens.accessToken)) {
        this.setAuth(user, tokens)
      } else {
        this.clearAuth()
      }
    } catch (error) {
      console.error('Auth init failed:', error)
      showToast.error('Authentication Error', 'Failed to restore session') // ✅ User notification
      this.clearAuth()
    }
  }

  async login(credentials: LoginRequest): Promise<boolean> {
    this.state.set({ ...this.state.get(), isLoading: true, error: null })

    try {
      const response = await this.authService.login(credentials)
      this.setAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
      })
      showToast.success('Welcome back!', `Logged in as ${response.user.displayName}`) // ✅ Toast
      return true
    } catch (error) {
      const message = error instanceof HttpError ? error.message : 'Login failed'
      this.state.set({ ...this.state.get(), error: message, isLoading: false })
      showToast.error('Login Failed', message) // ✅ Toast
      return false
    }
  }

  async signUp(userData: RegisterRequest): Promise<boolean> {
    const state = this.state.get()
    if (userData.password !== userData.confirmPassword) {
      this.state.set({ ...state, error: "Passwords do not match" })
      return false
    }

    this.state.set({ ...state, isLoading: true, error: null })

    try {
      const response = await this.authService.register(userData)
      this.setAuth(response.user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
      })
      showToast.success('Account Created', `Welcome, ${response.user.displayName}!`) // ✅ Toast
      return true
    } catch (error) {
      const message = error instanceof HttpError ? error.message : 'Sign up failed'
      this.state.set({ ...this.state.get(), error: message, isLoading: false })
      showToast.error('Sign Up Failed', message) // ✅ Toast
      return false
    }
  }

  async logout(): Promise<void> {
    const tokens = this.state.get().tokens
    if (tokens) {
      try {
        await this.authService.logout(tokens.accessToken)
      } catch (error) {
        console.warn('Logout request failed:', error)
      }
    }
    this.clearAuth()
    showToast.info('Logged out', 'See you next time!') // ✅ Toast
  }

  handleLoginFormChange(field: string, value: string) {
    const state = this.state.get()
    this.state.set({
      ...state,
      loginForm: {
        ...state.loginForm,
        [field]: value,
      },
    })
  }

  handleOnboardFormChange(field: string, value: string) {
    const state = this.state.get()
    this.state.set({
      ...state,
      onboardForm: {
        ...state.onboardForm,
        [field]: value,
      },
    })
  }

  clearError(): void {
    this.state.set({ ...this.state.get(), error: null })
  }

  async updateProfile(userData: Partial<IUser>): Promise<boolean> {
    const state = this.state.get()
    if (!state.isAuthenticated || !state.user) return false

    this.state.set({ ...state, isLoading: true, error: null })

    try {
      // TODO: Implement actual profile update API call
      const updatedUser = { ...state.user, ...userData } // Placeholder

      this.state.set({
        ...state,
        user: updatedUser,
        isLoading: false,
      })

      // Update cookies if necessary
      const tokens = state.tokens
      if (tokens) {
        clientCookies.setAuthCookies(tokens, updatedUser)
      }

      showToast.success('Profile Updated', 'Your profile has been updated successfully') // ✅ Toast
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed'
      this.state.set({
        ...state,
        error: message,
        isLoading: false,
      })
      showToast.error('Profile Update Failed', message) // ✅ Toast
      return false
    }
  }

  private setAuth(user: IUser, tokens: IAuthTokens): void {
    const current = this.state.get()

    // ✅ Prevent unnecessary updates
    if (current.isAuthenticated &&
        current.user?.id === user.id &&
        current.tokens?.accessToken === tokens.accessToken) {
      return
    }

    this.state.set({
      user,
      tokens,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
      loginForm: current.loginForm,
      onboardForm: current.onboardForm,
    })

    clientCookies.setAuthCookies(tokens, user)
    this.scheduleTokenRefresh(tokens)
  }

  private clearAuth(): void {
    this.state.set({
      ...initialState,
      isLoading: false,
      isInitialized: true,
    })
    clientCookies.clearAuthCookies()
    this.stopTokenRefresh()
  }

  private scheduleTokenRefresh(tokens: IAuthTokens): void {
    this.stopTokenRefresh()

    const payload = this.authService.decodeToken(tokens.accessToken)
    if (!payload?.exp) return

    const now = Date.now() / 1000
    const refreshIn = (payload.exp - now - 300) * 1000 // 5 min before expiry

    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(() => this.refreshToken(), refreshIn)
    }
  }

  private stopTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  async refreshToken(): Promise<boolean> {
    const { tokens, user } = this.state.get()
    if (!tokens?.refreshToken || !user) return false

    try {
      const response = await this.authService.refreshToken(tokens.refreshToken)

      this.setAuth(user, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        expiresIn: response.expiresIn,
        tokenType: response.tokenType,
      })

      showToast.success('Session Refreshed', 'Your session has been renewed') // ✅ Toast
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      showToast.error('Session Expired', 'Please log in again') // ✅ Toast
      this.clearAuth()
      return false
    }
  }

  isTokenExpired(token: string): boolean {
    return this.authService.isTokenExpired(token)
  }

  cleanup(): void {
    this.stopTokenRefresh()
  }

  // Expose state atom for components
  get $state() {
    return this.state
  }

  // Get current state (read-only)
  get currentState() {
    return this.state.get()
  }

  // Get authentication header
  getAuthHeader(): string | null {
    const state = this.state.get()
    return state.tokens
      ? `${state.tokens.tokenType} ${state.tokens.accessToken}`
      : null
  }

  // Get user initials
  getUserInitials(user: IUser | null): string | null {
    if (!user?.displayName) return null
    return user.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }
}

export const authManager = new AuthManager()
export const $auth = authManager.$state // Re-export for compatibility

// Export standalone functions for backward compatibility
export function getAuthHeader(): string | null {
  return authManager.getAuthHeader()
}

export function getUserInitials(user: IUser | null): string | null {
  return authManager.getUserInitials(user)
}