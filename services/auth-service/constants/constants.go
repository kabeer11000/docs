package constants

import "time"

// Authentication & Security Constants
const (
	// Account Lockout
	MaxFailedLoginAttempts = 5
	AccountLockoutDuration = 15 * time.Minute

	// Background Tasks
	MaxBackgroundTasks         = 100
	BackgroundTaskTimeout      = 5 * time.Second
	EmailSendTimeout           = 30 * time.Second
	FailedLoginUpdateTimeout   = 5 * time.Second
	LastLoginUpdateTimeout     = 5 * time.Second

	// Rate Limiting
	DefaultRateLimitPerMinute  = 60
	RateLimitWindow            = time.Minute
	RateLimitCleanupInterval   = time.Minute

	// Token Expiration
	EmailVerificationExpiry = 24 * time.Hour
	PasswordResetExpiry     = 1 * time.Hour
	OAuthStateExpiry        = 10 * time.Minute
	WebAuthnSessionExpiry   = 5 * time.Minute

	// Password Requirements
	MinPasswordLength = 8
	MaxPasswordLength = 128

	// Name Requirements
	MinNameLength = 2
	MaxNameLength = 100

	// Search
	MinSearchQueryLength = 2
	MaxSearchQueryLength = 100
	DefaultSearchLimit   = 10
	MaxSearchLimit       = 50

	// Server Timeouts
	ServerReadTimeout    = 15 * time.Second
	ServerWriteTimeout   = 15 * time.Second
	ServerIdleTimeout    = 60 * time.Second
	ServerShutdownTimeout = 30 * time.Second
	MaxHeaderBytes        = 1 << 20 // 1 MB

	// Database
	DatabaseConnectTimeout       = 10 * time.Second
	DatabasePingTimeout          = 10 * time.Second
	DatabaseIndexCreationTimeout = 30 * time.Second
	MongoMaxPoolSize             = 100
	MongoMinPoolSize             = 10
	MongoMaxConnIdleTime         = 5 * time.Minute
	MongoSocketTimeout           = 30 * time.Second

	// OAuth
	GoogleTokenExchangeTimeout = 10 * time.Second
	GoogleUserInfoTimeout      = 10 * time.Second

	// Redis
	RedisPoolSize          = 100
	RedisMinIdleConns      = 10
	RedisConnMaxIdleTime   = 30 * time.Minute
	RedisConnMaxLifetime   = 1 * time.Hour
	RedisDialTimeout       = 5 * time.Second
	RedisReadTimeout       = 3 * time.Second
	RedisWriteTimeout      = 3 * time.Second

	// Redis Key Prefixes
	RedisKeyPrefixRateLimit      = "ratelimit:"
	RedisKeyPrefixTokenBlacklist = "blacklist:"
	RedisKeyPrefixAccountLockout = "lockout:"

	// Redis TTLs
	RateLimitTTL           = time.Minute
	TokenBlacklistTTL      = 24 * time.Hour // Should match max token lifetime
	AccountLockoutTTL      = 15 * time.Minute

	// HTTP
	MaxRequestBodySize = 1 << 20 // 1 MB

	// Bcrypt
	DefaultBcryptCost = 12
	MinBcryptCost     = 10
	MaxBcryptCost     = 14
)

// Error Messages
const (
	ErrMsgInvalidCredentials     = "Invalid email or password"
	ErrMsgAccountLocked          = "Account is locked due to too many failed login attempts"
	ErrMsgPasswordAuthDisabled   = "Password authentication is not enabled for this account"
	ErrMsgUserAlreadyExists      = "User with this email already exists"
	ErrMsgUserNotFound           = "User not found"
	ErrMsgInvalidToken           = "Invalid or expired token"
	ErrMsgTokenExpired           = "Token has expired"
	ErrMsgInvalidTokenType       = "Invalid token type"
	ErrMsgRefreshTokenNotFound   = "Refresh token not found or has been revoked"
	ErrMsgEmailAlreadyVerified   = "Email is already verified"
	ErrMsgVerificationFailed     = "Email verification failed"
	ErrMsgPasswordResetFailed    = "Password reset failed"
	ErrMsgInvalidOAuthState      = "Invalid OAuth state"
	ErrMsgOAuthExchangeFailed    = "Failed to exchange OAuth code"
	ErrMsgWebAuthnFailed         = "WebAuthn ceremony failed"
	ErrMsgCredentialNotFound     = "Credential not found"
	ErrMsgSearchQueryTooShort    = "Search query must be at least 2 characters"
	ErrMsgSearchQueryTooLong     = "Search query is too long"
	ErrMsgRateLimitExceeded      = "Too many requests. Please try again later"
	ErrMsgRequestTooLarge        = "Request body is too large"
	ErrMsgUnauthorized           = "Unauthorized"
	ErrMsgForbidden              = "Forbidden"
	ErrMsgInternalServerError    = "Internal server error"
)

// Token Types
const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
	TokenTypeID      = "id"
)

// Verification Token Types
const (
	TokenTypeEmailVerification = "email_verification"
	TokenTypePasswordReset     = "password_reset"
)

// Auth Methods
const (
	AuthMethodPassword = "password"
	AuthMethodGoogle   = "google"
	AuthMethodPasskey  = "passkey"
)

// Subscription Plans
const (
	PlanFree       = "free"
	PlanPro        = "pro"
	PlanEnterprise = "enterprise"
)

// JWT Audiences
const (
	JWTAudienceAPI      = "lexa-api"
	JWTAudienceAuth     = "lexa-auth"
	JWTAudienceFrontend = "lexa-frontend"
)

// Environment Keys
const (
	EnvMongoDBURI               = "MONGODB_URI"
	EnvJWTPrivateKeyPath        = "JWT_PRIVATE_KEY_PATH"
	EnvJWTPublicKeyPath         = "JWT_PUBLIC_KEY_PATH"
	EnvJWTIssuer                = "JWT_ISSUER"
	EnvJWTAccessTokenExpires    = "JWT_ACCESS_TOKEN_EXPIRES"
	EnvJWTRefreshTokenExpires   = "JWT_REFRESH_TOKEN_EXPIRES"
	EnvJWTIDTokenExpires        = "JWT_ID_TOKEN_EXPIRES"
	EnvServerPort               = "SERVER_PORT"
	EnvServerHost               = "SERVER_HOST"
	EnvCORSAllowedOrigins       = "CORS_ALLOWED_ORIGINS"
	EnvRateLimitRequestsPerMin  = "RATE_LIMIT_REQUESTS_PER_MINUTE"
	EnvBcryptCost               = "BCRYPT_COST"
	EnvGoogleClientID           = "GOOGLE_CLIENT_ID"
	EnvGoogleClientSecret       = "GOOGLE_CLIENT_SECRET"
	EnvGoogleRedirectURL        = "GOOGLE_REDIRECT_URL"
	EnvWebAuthnDisplayName      = "WEBAUTHN_DISPLAY_NAME"
	EnvWebAuthnRPID             = "WEBAUTHN_RPID"
	EnvWebAuthnOrigin           = "WEBAUTHN_ORIGIN"
	EnvResendAPIKey             = "RESEND_API_KEY"
	EnvFromEmail                = "FROM_EMAIL"
	EnvFromName                 = "FROM_NAME"
	EnvFrontendURL              = "FRONTEND_URL"
	EnvRedisURL                 = "REDIS_URL"
	EnvLogLevel                 = "LOG_LEVEL"
)

// HTTP Headers
const (
	HeaderAuthorization  = "Authorization"
	HeaderContentType    = "Content-Type"
	HeaderRequestID      = "X-Request-ID"
	HeaderForwardedFor   = "X-Forwarded-For"
	HeaderRealIP         = "X-Real-IP"
)

// Content Types
const (
	ContentTypeJSON = "application/json"
	ContentTypeHTML = "text/html"
	ContentTypeText = "text/plain"
)

// Log Fields
const (
	LogFieldUserID      = "user_id"
	LogFieldEmail       = "email"
	LogFieldTenantID    = "tenant_id"
	LogFieldRequestID   = "request_id"
	LogFieldMethod      = "method"
	LogFieldPath        = "path"
	LogFieldStatus      = "status"
	LogFieldDuration    = "duration_ms"
	LogFieldError       = "error"
	LogFieldEvent       = "event"
	LogFieldIP          = "ip"
)

// Audit Events
const (
	AuditEventUserRegistered         = "user.registered"
	AuditEventUserLoggedIn           = "user.logged_in"
	AuditEventUserLoggedOut          = "user.logged_out"
	AuditEventUserFailedLogin        = "user.failed_login"
	AuditEventUserAccountLocked      = "user.account_locked"
	AuditEventUserEmailVerified      = "user.email_verified"
	AuditEventUserPasswordReset      = "user.password_reset"
	AuditEventUserPasswordChanged    = "user.password_changed"
	AuditEventUserOAuthLinked        = "user.oauth_linked"
	AuditEventUserPasskeyRegistered  = "user.passkey_registered"
	AuditEventUserPasskeyRemoved     = "user.passkey_removed"
	AuditEventTokenRefreshed         = "token.refreshed"
	AuditEventTokenRevoked           = "token.revoked"
	AuditEventTokenBlacklisted       = "token.blacklisted"
)
