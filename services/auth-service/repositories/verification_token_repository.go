package repositories

import (
	"context"
	"time"

	"authentication-service/database"
	"authentication-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type VerificationTokenRepository struct {
	collection *mongo.Collection
}

func NewVerificationTokenRepository() *VerificationTokenRepository {
	return &VerificationTokenRepository{
		collection: database.GetCollection("verification_tokens"),
	}
}

// Create creates or updates a verification token (upsert to replace existing tokens)
func (r *VerificationTokenRepository) Create(ctx context.Context, token *models.VerificationToken) error {
	token.CreatedAt = time.Now()

	// Upsert: replace any existing verification token for this user and type
	filter := bson.M{
		"user_id":    token.UserID,
		"token_type": token.TokenType,
	}

	update := bson.M{
		"$set": token,
	}

	opts := options.Update().SetUpsert(true)
	result, err := r.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return err
	}

	// If it was an upsert (insert), set the ID
	if result.UpsertedID != nil {
		token.ID = result.UpsertedID.(primitive.ObjectID)
	}

	return nil
}

// GetByToken retrieves a verification token by its hashed token value
func (r *VerificationTokenRepository) GetByToken(ctx context.Context, tokenHash string) (*models.VerificationToken, error) {
	var token models.VerificationToken

	// Find token that:
	// - Matches the hashed token
	// - Has not been used yet (used_at is nil)
	// - Has not expired
	err := r.collection.FindOne(ctx, bson.M{
		"token":      tokenHash,
		"used_at":    nil,
		"expires_at": bson.M{"$gt": time.Now()},
	}).Decode(&token)

	if err != nil {
		return nil, err
	}

	return &token, nil
}

// MarkAsUsed marks a verification token as used
func (r *VerificationTokenRepository) MarkAsUsed(ctx context.Context, tokenID primitive.ObjectID) error {
	now := time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": tokenID},
		bson.M{"$set": bson.M{"used_at": now}},
	)

	return err
}

// DeleteByUserIDAndType deletes all tokens for a user of a specific type
func (r *VerificationTokenRepository) DeleteByUserIDAndType(ctx context.Context, userID primitive.ObjectID, tokenType string) error {
	_, err := r.collection.DeleteMany(
		ctx,
		bson.M{
			"user_id":    userID,
			"token_type": tokenType,
		},
	)
	return err
}

// CleanupExpired deletes all expired tokens (for cleanup jobs)
func (r *VerificationTokenRepository) CleanupExpired(ctx context.Context) (int64, error) {
	result, err := r.collection.DeleteMany(
		ctx,
		bson.M{
			"expires_at": bson.M{"$lt": time.Now()},
		},
	)

	if err != nil {
		return 0, err
	}

	return result.DeletedCount, nil
}

// CreateIndexes creates indexes for the verification_tokens collection
func (r *VerificationTokenRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			// Unique compound index on user_id + token_type
			// Ensures only one active verification token per user per type
			Keys: bson.D{
				{Key: "user_id", Value: 1},
				{Key: "token_type", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
		{
			// Index on token for fast lookup
			Keys:    bson.D{{Key: "token", Value: 1}},
			Options: options.Index().SetSparse(true),
		},
		{
			// TTL index for automatic cleanup of expired tokens
			Keys: bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().
				SetExpireAfterSeconds(0). // Delete when expires_at is reached
				SetName("expires_at_ttl"),
		},
		{
			// Index on used_at for queries
			Keys:    bson.D{{Key: "used_at", Value: 1}},
			Options: options.Index().SetSparse(true),
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}
