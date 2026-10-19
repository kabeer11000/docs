package repositories

import (
	"context"
	"time"

	"authentication-service/database"
	"authentication-service/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type StateRepository struct {
	collection *mongo.Collection
}

func NewStateRepository() *StateRepository {
	return &StateRepository{
		collection: database.GetCollection("oauth_states"),
	}
}

func (r *StateRepository) Create(ctx context.Context, state *models.GoogleAuthState) error {
	_, err := r.collection.InsertOne(ctx, state)
	return err
}

func (r *StateRepository) ValidateAndConsume(ctx context.Context, state string) (bool, error) {
	// Find and delete the state in one operation
	result := r.collection.FindOneAndDelete(
		ctx,
		bson.M{
			"state": state,
			"expires_at": bson.M{"$gt": time.Now()},
		},
	)

	var stateDoc models.GoogleAuthState
	err := result.Decode(&stateDoc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (r *StateRepository) CleanExpiredStates(ctx context.Context) error {
	_, err := r.collection.DeleteMany(
		ctx,
		bson.M{"expires_at": bson.M{"$lt": time.Now()}},
	)
	return err
}

func (r *StateRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "state", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "expires_at", Value: 1}},
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}