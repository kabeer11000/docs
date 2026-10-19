package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type WebAuthnSessionData struct {
	UserID      primitive.ObjectID `json:"user_id" bson:"user_id"`
	SessionData string             `json:"session_data" bson:"session_data"`
	Type        string             `json:"type" bson:"type"` // "registration" or "login"
	ExpiresAt   time.Time          `json:"expires_at" bson:"expires_at"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
}