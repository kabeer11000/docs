package errors

import (
	"errors"
	"fmt"
)

// Sentinel errors for common cases
var (
	// Authentication errors
	ErrInvalidCredentials     = errors.New("invalid credentials")
	ErrUserNotFound           = errors.New("user not found")
	ErrUserAlreadyExists      = errors.New("user already exists")
	ErrPasswordAuthDisabled   = errors.New("password authentication not enabled for this account")
	ErrEmailNotVerified       = errors.New("email not verified")
	ErrAccountLocked          = errors.New("account is temporarily locked due to too many failed login attempts")

	// Token errors
	ErrInvalidToken           = errors.New("invalid token")
	ErrTokenExpired           = errors.New("token expired")
	ErrInvalidTokenType       = errors.New("invalid token type")
	ErrRefreshTokenNotFound   = errors.New("refresh token not found or expired")
	ErrRefreshTokenRevoked    = errors.New("refresh token has been revoked")

	// Authorization errors
	ErrUnauthorized           = errors.New("unauthorized")
	ErrForbidden              = errors.New("forbidden")
	ErrMissingAuthHeader      = errors.New("missing authorization header")
	ErrInvalidAuthHeader      = errors.New("invalid authorization header format")

	// Validation errors
	ErrInvalidEmail           = errors.New("invalid email format")
	ErrWeakPassword           = errors.New("password does not meet complexity requirements")
	ErrInvalidInput           = errors.New("invalid input")

	// OAuth errors
	ErrInvalidOAuthState      = errors.New("invalid or expired oauth state")
	ErrOAuthExchangeFailed    = errors.New("failed to exchange oauth code for token")
	ErrOAuthUserInfoFailed    = errors.New("failed to retrieve user information")

	// WebAuthn errors
	ErrWebAuthnCeremonyFailed = errors.New("webauthn ceremony failed")
	ErrCredentialNotFound     = errors.New("credential not found")

	// Database errors
	ErrDatabaseConnection     = errors.New("database connection failed")
	ErrDatabaseQuery          = errors.New("database query failed")
	ErrDatabaseUpdate         = errors.New("database update failed")

	// Rate limiting errors
	ErrRateLimitExceeded      = errors.New("rate limit exceeded")

	// Internal errors
	ErrInternal               = errors.New("internal server error")
	ErrServiceUnavailable     = errors.New("service temporarily unavailable")
)

// AuthError represents an authentication-specific error with additional context
type AuthError struct {
	Op      string // Operation that failed (e.g., "Login", "Register")
	Err     error  // The underlying error
	Message string // User-friendly message
	Code    string // Error code for clients
}

func (e *AuthError) Error() string {
	if e.Op == "" {
		return fmt.Sprintf("%s: %v", e.Code, e.Err)
	}
	return fmt.Sprintf("%s: %s: %v", e.Op, e.Code, e.Err)
}

func (e *AuthError) Unwrap() error {
	return e.Err
}

// NewAuthError creates a new AuthError
func NewAuthError(op string, err error, code string, message string) *AuthError {
	return &AuthError{
		Op:      op,
		Err:     err,
		Code:    code,
		Message: message,
	}
}

// DatabaseError represents a database operation error
type DatabaseError struct {
	Op         string // Operation (e.g., "Insert", "Update", "Find")
	Collection string // Collection name
	Err        error  // The underlying error
}

func (e *DatabaseError) Error() string {
	return fmt.Sprintf("database %s operation on %s: %v", e.Op, e.Collection, e.Err)
}

func (e *DatabaseError) Unwrap() error {
	return e.Err
}

// NewDatabaseError creates a new DatabaseError
func NewDatabaseError(op, collection string, err error) *DatabaseError {
	return &DatabaseError{
		Op:         op,
		Collection: collection,
		Err:        err,
	}
}

// ValidationError represents a validation error with field information
type ValidationError struct {
	Field   string // Field that failed validation
	Value   string // The invalid value (sanitized)
	Message string // Validation error message
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation failed for field '%s': %s", e.Field, e.Message)
}

// NewValidationError creates a new ValidationError
func NewValidationError(field, message string) *ValidationError {
	return &ValidationError{
		Field:   field,
		Message: message,
	}
}

// MultiError represents multiple errors
type MultiError struct {
	Errors []error
}

func (e *MultiError) Error() string {
	if len(e.Errors) == 0 {
		return "no errors"
	}
	if len(e.Errors) == 1 {
		return e.Errors[0].Error()
	}
	return fmt.Sprintf("%v (and %d more errors)", e.Errors[0], len(e.Errors)-1)
}

// Add adds an error to the MultiError
func (e *MultiError) Add(err error) {
	if err != nil {
		e.Errors = append(e.Errors, err)
	}
}

// HasErrors returns true if there are any errors
func (e *MultiError) HasErrors() bool {
	return len(e.Errors) > 0
}

// ToError returns the MultiError as an error, or nil if there are no errors
func (e *MultiError) ToError() error {
	if !e.HasErrors() {
		return nil
	}
	return e
}
