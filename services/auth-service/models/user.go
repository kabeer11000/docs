package models

import (
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthMethod string

const (
	AuthMethodPassword AuthMethod = "password"
	AuthMethodGoogle   AuthMethod = "google"
	AuthMethodPasskey  AuthMethod = "passkey"
)

type PlanType string

const (
	PlanFree       PlanType = "free"
	PlanPro        PlanType = "pro"
	PlanEnterprise PlanType = "enterprise"
)

type Subscription struct {
	Plan      PlanType   `bson:"plan" json:"plan"`
	Status    string     `bson:"status" json:"status"`
	ExpiresAt *time.Time `bson:"expires_at,omitempty" json:"expires_at,omitempty"`
	CreatedAt time.Time  `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time  `bson:"updated_at" json:"updated_at"`
}

type User struct {
	ID                   primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email                string             `bson:"email" json:"email"`
	Name                 string             `bson:"name" json:"name"`
	TenantID             string             `bson:"tenant_id" json:"tenant_id"`
	PasswordHash         string             `bson:"password_hash,omitempty" json:"-"`
	AuthMethods          []AuthMethod       `bson:"auth_methods" json:"auth_methods"`
	GoogleID             string             `bson:"google_id,omitempty" json:"google_id,omitempty"`
	Credentials          []Credential       `bson:"credentials,omitempty" json:"credentials,omitempty"`
	RefreshTokens        []RefreshToken     `bson:"refresh_tokens,omitempty" json:"-"`
	EmailVerified        bool               `bson:"email_verified" json:"email_verified"`
	Subscription         Subscription       `bson:"subscription" json:"subscription"`
	FailedLoginAttempts  int                `bson:"failed_login_attempts" json:"-"`
	AccountLockedUntil   *time.Time         `bson:"account_locked_until,omitempty" json:"-"`
	LastFailedLoginAt    *time.Time         `bson:"last_failed_login_at,omitempty" json:"-"`
	CreatedAt            time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt            time.Time          `bson:"updated_at" json:"updated_at"`
	LastLoginAt          *time.Time         `bson:"last_login_at,omitempty" json:"last_login_at,omitempty"`
}

type Credential struct {
	ID              string    `bson:"id" json:"id"`
	PublicKey       []byte    `bson:"public_key" json:"public_key"`
	AttestationType string    `bson:"attestation_type" json:"attestation_type"`
	Transport       []string  `bson:"transport" json:"transport"`
	Flags           []byte    `bson:"flags" json:"flags"`
	Authenticator   []byte    `bson:"authenticator" json:"authenticator"`
	CreatedAt       time.Time `bson:"created_at" json:"created_at"`
}

type RefreshToken struct {
	Token     string    `bson:"token" json:"-"`
	ExpiresAt time.Time `bson:"expires_at" json:"expires_at"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	IsRevoked bool      `bson:"is_revoked" json:"is_revoked"`
	UserAgent string    `bson:"user_agent,omitempty" json:"user_agent,omitempty"`
	IPAddress string    `bson:"ip_address,omitempty" json:"ip_address,omitempty"`
}

// WebAuthn interface methods
func (u User) WebAuthnID() []byte {
	return []byte(u.ID.Hex())
}

func (u User) WebAuthnName() string {
	return u.Email
}

func (u User) WebAuthnDisplayName() string {
	return u.Name
}

func (u User) WebAuthnIcon() string {
	return ""
}

func (u User) WebAuthnCredentials() []webauthn.Credential {
	var credentials []webauthn.Credential
	for _, cred := range u.Credentials {
		// Convert string slice to protocol.AuthenticatorTransport slice
		var transports []protocol.AuthenticatorTransport
		for _, t := range cred.Transport {
			transports = append(transports, protocol.AuthenticatorTransport(t))
		}

		credentials = append(credentials, webauthn.Credential{
			ID:              []byte(cred.ID),
			PublicKey:       cred.PublicKey,
			AttestationType: cred.AttestationType,
			Transport:       transports,
			Flags:           webauthn.CredentialFlags{},
			Authenticator:   webauthn.Authenticator{},
		})
	}
	return credentials
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	TenantID string `json:"tenant_id" binding:"required"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Name     string `json:"name" binding:"required,min=2"`
	Password string `json:"password" binding:"required,min=8"`
	TenantID string `json:"tenant_id" binding:"required"`
}

type AuthResponse struct {
	User         User   `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type TokenRefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type GoogleAuthState struct {
	State     string    `bson:"state" json:"state"`
	ExpiresAt time.Time `bson:"expires_at" json:"expires_at"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
}
