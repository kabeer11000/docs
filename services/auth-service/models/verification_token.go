package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VerificationToken represents a token for email verification or password reset
type VerificationToken struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"user_id"`
	Token     string             `bson:"token" json:"token"` // Hashed token
	TokenType string             `bson:"token_type" json:"token_type"` // "email_verification" or "password_reset"
	ExpiresAt time.Time          `bson:"expires_at" json:"expires_at"`
	CreatedAt time.Time          `bson:"created_at" json:"created_at"`
	UsedAt    *time.Time         `bson:"used_at,omitempty" json:"used_at,omitempty"` // nil if not used yet
}
