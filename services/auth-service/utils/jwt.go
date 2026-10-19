package utils

import (
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"authentication-service/models"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	privateKey *ecdsa.PrivateKey
	publicKey  *ecdsa.PublicKey
)

type Claims struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	TenantID  string `json:"tenant_id"`
	Plan      string `json:"plan"`
	TokenType string `json:"token_type"`
	Scope     []string `json:"scope,omitempty"`
	jwt.RegisteredClaims
}

func InitJWT() error {
	// Prefer inline PEM content (JWT_PRIVATE_KEY / JWT_PUBLIC_KEY) since
	// platforms like Render don't let you ship key files in the repo.
	// Falls back to reading from JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH
	// for local development.
	privateKeyData := []byte(strings.ReplaceAll(os.Getenv("JWT_PRIVATE_KEY"), "\\n", "\n"))
	publicKeyData := []byte(strings.ReplaceAll(os.Getenv("JWT_PUBLIC_KEY"), "\\n", "\n"))

	var err error
	if len(privateKeyData) == 0 {
		privateKeyPath := os.Getenv("JWT_PRIVATE_KEY_PATH")
		if privateKeyPath == "" {
			privateKeyPath = "./keys/jwt_private.pem"
		}
		privateKeyData, err = os.ReadFile(privateKeyPath)
		if err != nil {
			return errors.New("failed to read private key file: " + err.Error())
		}
	}
	if len(publicKeyData) == 0 {
		publicKeyPath := os.Getenv("JWT_PUBLIC_KEY_PATH")
		if publicKeyPath == "" {
			publicKeyPath = "./keys/jwt_public.pem"
		}
		publicKeyData, err = os.ReadFile(publicKeyPath)
		if err != nil {
			return errors.New("failed to read public key file: " + err.Error())
		}
	}

	privateKeyBlock, _ := pem.Decode(privateKeyData)
	if privateKeyBlock == nil {
		return errors.New("failed to decode private key PEM block")
	}

	// Try PKCS8 format first (most common for ECDSA)
	parsedKey, err := x509.ParsePKCS8PrivateKey(privateKeyBlock.Bytes)
	if err != nil {
		// Try EC private key format
		parsedKey, err = x509.ParseECPrivateKey(privateKeyBlock.Bytes)
		if err != nil {
			return errors.New("failed to parse private key: " + err.Error())
		}
	}
	
	var ok bool
	privateKey, ok = parsedKey.(*ecdsa.PrivateKey)
	if !ok {
		return errors.New("private key is not ECDSA key")
	}

	publicKeyBlock, _ := pem.Decode(publicKeyData)
	if publicKeyBlock == nil {
		return errors.New("failed to decode public key PEM block")
	}

	parsedPublicKey, err := x509.ParsePKIXPublicKey(publicKeyBlock.Bytes)
	if err != nil {
		return errors.New("failed to parse public key: " + err.Error())
	}

	publicKey, ok = parsedPublicKey.(*ecdsa.PublicKey)
	if !ok {
		return errors.New("public key is not ECDSA key")
	}

	return nil
}

func GenerateAccessToken(user *models.User) (string, error) {
	expiresIn := getTokenDuration("JWT_ACCESS_TOKEN_EXPIRES", "15m")

	claims := Claims{
		UserID:    user.ID.Hex(),
		Email:     user.Email,
		Name:      user.Name,
		TenantID:  user.TenantID,
		Plan:      string(user.Subscription.Plan),
		TokenType: "access",
		Scope:     []string{"read", "write"},
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    os.Getenv("JWT_ISSUER"),
			Subject:   user.ID.Hex(),
			Audience:  []string{"lexa-api"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
			NotBefore: jwt.NewNumericDate(time.Now()),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	return token.SignedString(privateKey)
}

func GenerateRefreshToken(user *models.User) (string, error) {
	expiresIn := getTokenDuration("JWT_REFRESH_TOKEN_EXPIRES", "30d") // 30 days

	claims := Claims{
		UserID:    user.ID.Hex(),
		Email:     user.Email,
		TenantID:  user.TenantID,
		Plan:      string(user.Subscription.Plan),
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    os.Getenv("JWT_ISSUER"),
			Subject:   user.ID.Hex(),
			Audience:  []string{"lexa-auth"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
			NotBefore: jwt.NewNumericDate(time.Now()),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	return token.SignedString(privateKey)
}

func GenerateIDToken(user *models.User) (string, error) {
	expiresIn := getTokenDuration("JWT_ID_TOKEN_EXPIRES", "1h")

	claims := Claims{
		UserID:    user.ID.Hex(),
		Email:     user.Email,
		Name:      user.Name,
		TenantID:  user.TenantID,
		Plan:      string(user.Subscription.Plan),
		TokenType: "id",
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    os.Getenv("JWT_ISSUER"),
			Subject:   user.ID.Hex(),
			Audience:  []string{"lexa-frontend"},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
			NotBefore: jwt.NewNumericDate(time.Now()),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	return token.SignedString(privateKey)
}

func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodECDSA); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func GetUserIDFromToken(tokenString string) (primitive.ObjectID, error) {
	claims, err := ValidateToken(tokenString)
	if err != nil {
		return primitive.NilObjectID, err
	}

	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return primitive.NilObjectID, err
	}

	return userID, nil
}

func getTokenDuration(envKey, defaultDuration string) time.Duration {
	durationStr := os.Getenv(envKey)
	if durationStr == "" {
		durationStr = defaultDuration
	}

	duration, err := time.ParseDuration(durationStr)
	if err != nil {
		// If it's a number, treat it as minutes
		if minutes, err := strconv.Atoi(durationStr); err == nil {
			return time.Duration(minutes) * time.Minute
		}
		// Fallback to default
		duration, _ = time.ParseDuration(defaultDuration)
	}

	return duration
}

// GetAccessTokenDuration returns the access token duration in seconds
func GetAccessTokenDuration() int {
	duration := getTokenDuration("JWT_ACCESS_TOKEN_EXPIRES", "15m")
	return int(duration.Seconds())
}

// GetRefreshTokenDuration returns the refresh token duration
func GetRefreshTokenDuration() time.Duration {
	return getTokenDuration("JWT_REFRESH_TOKEN_EXPIRES", "30d")
}

// GetIDTokenDuration returns the ID token duration
func GetIDTokenDuration() time.Duration {
	return getTokenDuration("JWT_ID_TOKEN_EXPIRES", "1h")
}
