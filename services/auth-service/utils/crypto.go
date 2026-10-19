package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"strconv"

	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	costStr := os.Getenv("BCRYPT_COST")
	cost := bcrypt.DefaultCost
	
	if costStr != "" {
		if c, err := strconv.Atoi(costStr); err == nil && c >= bcrypt.MinCost && c <= bcrypt.MaxCost {
			cost = c
		}
	}

	bytes, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

func GenerateState() (string, error) {
	return GenerateSecureToken(32)
}

func SecureCompare(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func GenerateAPIKey() (string, error) {
	token, err := GenerateSecureToken(32)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("lx_%s", token), nil
}

// HashToken hashes a token using SHA-256 for storage
// This is used for refresh tokens to prevent plaintext storage
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// VerifyTokenHash compares a token against its hash using constant-time comparison
func VerifyTokenHash(token, hash string) bool {
	tokenHash := HashToken(token)
	return subtle.ConstantTimeCompare([]byte(tokenHash), []byte(hash)) == 1
}