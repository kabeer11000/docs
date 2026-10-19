package repositories

import (
	"context"
	"time"

	"authentication-service/database"
	"authentication-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type WebAuthnSessionRepository struct {
	collection *mongo.Collection
}

func NewWebAuthnSessionRepository() *WebAuthnSessionRepository {
	return &WebAuthnSessionRepository{
		collection: database.GetCollection("webauthn_sessions"),
	}
}

func (r *WebAuthnSessionRepository) Store(ctx context.Context, challengeID string, sessionData models.WebAuthnSessionData) error {
	doc := bson.M{
		"challenge_id":  challengeID,
		"user_id":       sessionData.UserID,
		"session_data":  sessionData.SessionData,
		"type":          sessionData.Type,
		"expires_at":    sessionData.ExpiresAt,
		"created_at":    time.Now(),
	}

	_, err := r.collection.InsertOne(ctx, doc)
	return err
}

func (r *WebAuthnSessionRepository) Get(ctx context.Context, challengeID string) (*models.WebAuthnSessionData, error) {
	var result models.WebAuthnSessionData

	err := r.collection.FindOne(
		ctx,
		bson.M{
			"challenge_id": challengeID,
			"expires_at":   bson.M{"$gt": time.Now()},
		},
	).Decode(&result)

	if err != nil {
		return nil, err
	}

	return &result, nil
}

func (r *WebAuthnSessionRepository) Delete(ctx context.Context, challengeID string) error {
	_, err := r.collection.DeleteOne(
		ctx,
		bson.M{"challenge_id": challengeID},
	)
	return err
}

func (r *WebAuthnSessionRepository) CleanExpiredSessions(ctx context.Context) error {
	_, err := r.collection.DeleteMany(
		ctx,
		bson.M{"expires_at": bson.M{"$lt": time.Now()}},
	)
	return err
}

func (r *WebAuthnSessionRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "challenge_id", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "expires_at", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "user_id", Value: 1}},
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}