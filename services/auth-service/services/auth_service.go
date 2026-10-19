package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	autherrors "authentication-service/errors"
	"authentication-service/models"
	"authentication-service/repositories"
	"authentication-service/utils"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/sync/errgroup"
)

type AuthService struct {
	userRepo *repositories.UserRepository
}

func NewAuthService(userRepo *repositories.UserRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
	}
}

func (s *AuthService) Register(ctx context.Context, req models.RegisterRequest) (*models.AuthResponse, error) {
	// Validate password complexity
	if validationErrors := utils.ValidatePassword(req.Password); len(validationErrors) > 0 {
		return nil, fmt.Errorf("password validation failed: %s", validationErrors[0])
	}

	// Check if user already exists in this tenant
	existingUser, err := s.userRepo.GetByEmailAndTenant(ctx, req.Email, req.TenantID)
	if err != nil && err != mongo.ErrNoDocuments {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existingUser != nil {
		return nil, autherrors.ErrUserAlreadyExists
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user with default free subscription
	now := time.Now()
	user := &models.User{
		Email:         req.Email,
		Name:          req.Name,
		TenantID:      req.TenantID,
		PasswordHash:  hashedPassword,
		AuthMethods:   []models.AuthMethod{models.AuthMethodPassword},
		EmailVerified: false,
		Subscription: models.Subscription{
			Plan:      models.PlanFree,
			Status:    "active",
			ExpiresAt: nil, // Free plan doesn't expire
			CreatedAt: now,
			UpdatedAt: now,
		},
	}

	err = s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return s.generateTokenResponse(ctx, user)
}

func (s *AuthService) Login(ctx context.Context, req models.LoginRequest) (*models.AuthResponse, error) {
	// Get user by email and tenant
	user, err := s.userRepo.GetByEmailAndTenant(ctx, req.Email, req.TenantID)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, autherrors.ErrInvalidCredentials
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	// Check if account is locked
	if user.AccountLockedUntil != nil && user.AccountLockedUntil.After(time.Now()) {
		return nil, fmt.Errorf("%w (locked until %v)", autherrors.ErrAccountLocked, user.AccountLockedUntil.Format(time.RFC3339))
	}

	// Check if user has password auth method
	hasPasswordAuth := false
	for _, method := range user.AuthMethods {
		if method == models.AuthMethodPassword {
			hasPasswordAuth = true
			break
		}
	}

	if !hasPasswordAuth {
		return nil, autherrors.ErrPasswordAuthDisabled
	}

	// Verify password
	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		// Increment failed login attempts
		userID := user.ID
		utils.ExecuteBackgroundTask(ctx, func() {
			bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			_ = s.userRepo.IncrementFailedLoginAttempts(bgCtx, userID)

			// Lock account after 5 failed attempts (lock for 15 minutes)
			updatedUser, err := s.userRepo.GetByID(bgCtx, userID)
			if err == nil && updatedUser.FailedLoginAttempts >= 5 {
				lockUntil := time.Now().Add(15 * time.Minute)
				_ = s.userRepo.LockAccount(bgCtx, userID, lockUntil)
			}
		})

		return nil, autherrors.ErrInvalidCredentials
	}

	// Reset failed login attempts on successful login
	if user.FailedLoginAttempts > 0 {
		userID := user.ID
		utils.ExecuteBackgroundTask(ctx, func() {
			bgCtx := context.Background()
			_ = s.userRepo.ResetFailedLoginAttempts(bgCtx, userID)
		})
	}

	// Update last login using bounded goroutine executor (don't block on error)
	userID := user.ID
	utils.ExecuteBackgroundTask(ctx, func() {
		bgCtx := context.Background()
		_ = s.userRepo.UpdateLastLogin(bgCtx, userID)
	})

	return s.generateTokenResponse(ctx, user)
}

func (s *AuthService) RefreshToken(ctx context.Context, req models.TokenRefreshRequest) (*models.AuthResponse, error) {
	// Validate refresh token
	claims, err := utils.ValidateToken(req.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", autherrors.ErrInvalidToken, err)
	}

	if claims.TokenType != "refresh" {
		return nil, autherrors.ErrInvalidTokenType
	}

	// Get user
	userID, err := primitive.ObjectIDFromHex(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("%w: invalid user ID format", autherrors.ErrInvalidToken)
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", autherrors.ErrUserNotFound, err)
	}

	// Check if refresh token exists and is valid
	_, err = s.userRepo.GetValidRefreshToken(ctx, userID, req.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", autherrors.ErrRefreshTokenNotFound, err)
	}

	// Revoke the old refresh token
	err = s.userRepo.RevokeRefreshToken(ctx, userID, req.RefreshToken)
	if err != nil {
		// Log error but continue
	}

	return s.generateTokenResponse(ctx, user)
}

// generateTokenResponse generates access, refresh, and ID tokens in parallel
func (s *AuthService) generateTokenResponse(ctx context.Context, user *models.User) (*models.AuthResponse, error) {
	// Use errgroup to generate tokens concurrently
	g, ctx := errgroup.WithContext(ctx)

	var accessToken, refreshToken, idToken string

	// Generate access token
	g.Go(func() error {
		var err error
		accessToken, err = utils.GenerateAccessToken(user)
		return err
	})

	// Generate refresh token
	g.Go(func() error {
		var err error
		refreshToken, err = utils.GenerateRefreshToken(user)
		return err
	})

	// Generate ID token
	g.Go(func() error {
		var err error
		idToken, err = utils.GenerateIDToken(user)
		return err
	})

	// Wait for all token generations to complete
	if err := g.Wait(); err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	// Store refresh token (hash it for security)
	refreshTokenModel := models.RefreshToken{
		Token:     utils.HashToken(refreshToken), // Store hashed version
		ExpiresAt: time.Now().Add(utils.GetRefreshTokenDuration()),
		CreatedAt: time.Now(),
		IsRevoked: false,
	}

	// CRITICAL FIX: Use fresh context with dedicated timeout for DB write
	// This prevents context deadline exceeded errors when HTTP request context is near expiry
	// Pattern follows existing background task implementation (line 109: IncrementFailedLoginAttempts)
	dbCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := s.userRepo.AddRefreshToken(dbCtx, user.ID, refreshTokenModel)
	if err != nil {
		// SECURITY: Don't return tokens if we can't validate them later (OAuth 2.0 RFC 6749 §6)
		return nil, fmt.Errorf("failed to store refresh token: %w", err)
	}

	// Clean user data for response
	responseUser := *user
	responseUser.PasswordHash = ""
	responseUser.RefreshTokens = nil

	return &models.AuthResponse{
		User:         responseUser,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		IDToken:      idToken,
		ExpiresIn:    utils.GetAccessTokenDuration(), // Use actual access token duration from config
		TokenType:    "Bearer",
	}, nil
}

func (s *AuthService) RevokeRefreshToken(ctx context.Context, userID primitive.ObjectID, token string) error {
	return s.userRepo.RevokeRefreshToken(ctx, userID, token)
}

func (s *AuthService) GetUserByID(ctx context.Context, userID primitive.ObjectID) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	// Clean sensitive data
	user.PasswordHash = ""
	user.RefreshTokens = nil

	return user, nil
}

func (s *AuthService) SearchUsers(ctx context.Context, query string, tenantID string, limit int) ([]models.User, error) {
	// Input validation
	if len(query) < 2 {
		return []models.User{}, nil
	}

	if len(query) > 100 {
		return nil, errors.New("search query too long")
	}

	// Call repository to search users
	users, err := s.userRepo.SearchUsers(ctx, query, tenantID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search users: %w", err)
	}

	// Sanitize sensitive data from all users
	for i := range users {
		users[i].PasswordHash = ""
		users[i].RefreshTokens = nil
		users[i].Credentials = nil
	}

	return users, nil
}
