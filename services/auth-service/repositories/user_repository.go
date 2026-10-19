package repositories

import (
	"context"
	"time"

	"authentication-service/database"
	"authentication-service/models"
	"authentication-service/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserRepository struct {
	collection *mongo.Collection
}

func NewUserRepository() *UserRepository {
	return &UserRepository{
		collection: database.GetCollection("users"),
	}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	result, err := r.collection.InsertOne(ctx, user)
	if err != nil {
		return err
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByEmailAndTenant(ctx context.Context, email, tenantID string) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"email": email, "tenant_id": tenantID}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"google_id": googleID}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": user.ID},
		bson.M{"$set": user},
	)
	return err
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{"last_login_at": now}},
	)
	return err
}

func (r *UserRepository) AddRefreshToken(ctx context.Context, userID primitive.ObjectID, refreshToken models.RefreshToken) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$push": bson.M{"refresh_tokens": refreshToken}},
	)
	return err
}

func (r *UserRepository) RevokeRefreshToken(ctx context.Context, userID primitive.ObjectID, token string) error {
	// Hash the token before querying (tokens are stored hashed)
	tokenHash := utils.HashToken(token)

	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{
			"_id":                  userID,
			"refresh_tokens.token": tokenHash,
		},
		bson.M{"$set": bson.M{"refresh_tokens.$.is_revoked": true}},
	)
	return err
}

func (r *UserRepository) GetValidRefreshToken(ctx context.Context, userID primitive.ObjectID, token string) (*models.RefreshToken, error) {
	// Hash the token before querying (tokens are stored hashed)
	tokenHash := utils.HashToken(token)

	var user models.User
	err := r.collection.FindOne(
		ctx,
		bson.M{
			"_id": userID,
			"refresh_tokens": bson.M{
				"$elemMatch": bson.M{
					"token":      tokenHash,
					"is_revoked": false,
					"expires_at": bson.M{"$gt": time.Now()},
				},
			},
		},
	).Decode(&user)

	if err != nil {
		return nil, err
	}

	// Find the matching token in the user's refresh tokens
	for _, rt := range user.RefreshTokens {
		if rt.Token == tokenHash && !rt.IsRevoked && rt.ExpiresAt.After(time.Now()) {
			return &rt, nil
		}
	}

	return nil, mongo.ErrNoDocuments
}

func (r *UserRepository) AddCredential(ctx context.Context, userID primitive.ObjectID, credential models.Credential) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$push": bson.M{"credentials": credential}},
	)
	return err
}

func (r *UserRepository) GetCredentials(ctx context.Context, userID primitive.ObjectID) ([]models.Credential, error) {
	var user models.User
	err := r.collection.FindOne(
		ctx,
		bson.M{"_id": userID},
		options.FindOne().SetProjection(bson.M{"credentials": 1}),
	).Decode(&user)

	if err != nil {
		return nil, err
	}

	return user.Credentials, nil
}

func (r *UserRepository) DeleteCredential(ctx context.Context, userID primitive.ObjectID, credentialID string) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$pull": bson.M{"credentials": bson.M{"id": credentialID}}},
	)
	return err
}

func (r *UserRepository) UpdateCredentialLastUsed(ctx context.Context, userID primitive.ObjectID, credentialID string) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{
			"_id":            userID,
			"credentials.id": credentialID,
		},
		bson.M{"$set": bson.M{"credentials.$.last_used_at": now}},
	)
	return err
}

func (r *UserRepository) UpdateCredentialSignCount(ctx context.Context, userID primitive.ObjectID, credentialID string, count uint32) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{
			"_id":            userID,
			"credentials.id": credentialID,
		},
		bson.M{"$set": bson.M{"credentials.$.sign_count": count}},
	)
	return err
}

func (r *UserRepository) HasPasswordAuth(ctx context.Context, userID primitive.ObjectID) (bool, error) {
	var user models.User
	err := r.collection.FindOne(
		ctx,
		bson.M{"_id": userID},
		options.FindOne().SetProjection(bson.M{"auth_methods": 1}),
	).Decode(&user)

	if err != nil {
		return false, err
	}

	for _, method := range user.AuthMethods {
		if method == models.AuthMethodPassword {
			return true, nil
		}
	}

	return false, nil
}

func (r *UserRepository) GetCredentialCount(ctx context.Context, userID primitive.ObjectID) (int, error) {
	var user models.User
	err := r.collection.FindOne(
		ctx,
		bson.M{"_id": userID},
		options.FindOne().SetProjection(bson.M{"credentials": 1}),
	).Decode(&user)

	if err != nil {
		return 0, err
	}

	return len(user.Credentials), nil
}

func (r *UserRepository) SearchUsers(ctx context.Context, query string, tenantID string, limit int) ([]models.User, error) {
	// Cap limit to prevent excessive results
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	// Build case-insensitive regex search filter
	filter := bson.M{
		"tenant_id": tenantID,
		"$or": []bson.M{
			{"email": bson.M{"$regex": query, "$options": "i"}},
			{"name": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	// Project only necessary fields, exclude sensitive data
	projection := bson.M{
		"_id":            1,
		"email":          1,
		"name":           1,
		"tenant_id":      1,
		"email_verified": 1,
	}

	findOptions := options.Find().
		SetLimit(int64(limit)).
		SetProjection(projection).
		SetSort(bson.D{{Key: "name", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, findOptions)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err = cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	return users, nil
}

// IncrementFailedLoginAttempts increments the failed login counter
func (r *UserRepository) IncrementFailedLoginAttempts(ctx context.Context, userID primitive.ObjectID) error {
	now := time.Now()
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{
			"$inc": bson.M{"failed_login_attempts": 1},
			"$set": bson.M{
				"last_failed_login_at": now,
				"updated_at":           now,
			},
		},
	)
	return err
}

// ResetFailedLoginAttempts resets the failed login counter
func (r *UserRepository) ResetFailedLoginAttempts(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{
			"$set": bson.M{
				"failed_login_attempts": 0,
				"account_locked_until":  nil,
				"last_failed_login_at":  nil,
				"updated_at":            time.Now(),
			},
		},
	)
	return err
}

// LockAccount locks the account until the specified time
func (r *UserRepository) LockAccount(ctx context.Context, userID primitive.ObjectID, lockUntil time.Time) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{
			"$set": bson.M{
				"account_locked_until": lockUntil,
				"updated_at":           time.Now(),
			},
		},
	)
	return err
}

// MarkEmailAsVerified marks a user's email as verified
func (r *UserRepository) MarkEmailAsVerified(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{
			"email_verified": true,
			"updated_at":     time.Now(),
		}},
	)
	return err
}

// UpdatePassword updates a user's password
func (r *UserRepository) UpdatePassword(ctx context.Context, userID primitive.ObjectID, hashedPassword string) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{
			"password_hash": hashedPassword,
			"updated_at":    time.Now(),
		}},
	)
	return err
}

// RevokeAllRefreshTokens revokes all refresh tokens for a user (used after password reset)
func (r *UserRepository) RevokeAllRefreshTokens(ctx context.Context, userID primitive.ObjectID) error {
	_, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": userID},
		bson.M{"$set": bson.M{
			"refresh_tokens.$[].is_revoked": true,
			"updated_at":                     time.Now(),
		}},
	)
	return err
}

func (r *UserRepository) CreateIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		// Unique compound index for email + tenant_id (multi-tenant uniqueness)
		{
			Keys:    bson.D{{Key: "email", Value: 1}, {Key: "tenant_id", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("email_tenant_unique_idx"),
		},
		// Google ID index (sparse for optional OAuth users)
		{
			Keys:    bson.D{{Key: "google_id", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("google_id_idx"),
		},
		// Refresh tokens index for token validation
		{
			Keys:    bson.D{{Key: "refresh_tokens.token", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("refresh_tokens_idx"),
		},
		// Tenant ID index for tenant-scoped queries
		{
			Keys:    bson.D{{Key: "tenant_id", Value: 1}},
			Options: options.Index().SetName("tenant_id_idx"),
		},
		// Name index for sorting in SearchUsers
		{
			Keys:    bson.D{{Key: "name", Value: 1}},
			Options: options.Index().SetName("name_idx"),
		},
		// Text index for efficient search on email and name
		{
			Keys: bson.D{
				{Key: "email", Value: "text"},
				{Key: "name", Value: "text"},
			},
			Options: options.Index().SetName("text_search_idx"),
		},
		// Compound index for tenant + name (for search performance)
		{
			Keys: bson.D{
				{Key: "tenant_id", Value: 1},
				{Key: "name", Value: 1},
			},
			Options: options.Index().SetName("tenant_name_idx"),
		},
	}

	_, err := r.collection.Indexes().CreateMany(ctx, indexes)
	return err
}