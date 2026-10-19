package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"authentication-service/constants"
	"authentication-service/errors"
	"authentication-service/models"
	"authentication-service/repositories"
	"authentication-service/utils"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type VerificationService struct {
	verificationRepo *repositories.VerificationTokenRepository
	userRepo         *repositories.UserRepository
	emailService     *EmailService
}

func NewVerificationService(
	verificationRepo *repositories.VerificationTokenRepository,
	userRepo         *repositories.UserRepository,
	emailService     *EmailService,
) *VerificationService {
	return &VerificationService{
		verificationRepo: verificationRepo,
		userRepo:         userRepo,
		emailService:     emailService,
	}
}

// SendVerificationEmail generates and sends a verification email
func (s *VerificationService) SendVerificationEmail(ctx context.Context, userID primitive.ObjectID) error {
	logger := utils.GetLogger()

	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Check if already verified
	if user.EmailVerified {
		return fmt.Errorf(constants.ErrMsgEmailAlreadyVerified)
	}

	// Generate secure random token (32 bytes = 256 bits)
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}

	// Base64 URL-safe encoding for the token
	token := base64.URLEncoding.EncodeToString(tokenBytes)

	// Hash the token before storing (like refresh tokens)
	tokenHash := utils.HashToken(token)

	// Create verification token record
	verificationToken := &models.VerificationToken{
		UserID:    userID,
		Token:     tokenHash,
		TokenType: constants.TokenTypeEmailVerification,
		ExpiresAt: time.Now().Add(constants.EmailVerificationExpiry),
		CreatedAt: time.Now(),
	}

	// Store in database (upserts, replacing any existing verification token)
	if err := s.verificationRepo.Create(ctx, verificationToken); err != nil {
		return fmt.Errorf("failed to store verification token: %w", err)
	}

	// Send email asynchronously (don't block registration)
	utils.ExecuteBackgroundTask(ctx, func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), constants.EmailSendTimeout)
		defer cancel()

		if err := s.emailService.SendVerificationEmail(bgCtx, user.Email, user.Name, token); err != nil {
			logger.Error().Err(err).
				Str(constants.LogFieldUserID, userID.Hex()).
				Str(constants.LogFieldEmail, user.Email).
				Msg("Failed to send verification email")
		} else {
			logger.Info().
				Str(constants.LogFieldUserID, userID.Hex()).
				Str(constants.LogFieldEmail, user.Email).
				Str(constants.LogFieldEvent, constants.AuditEventUserEmailVerified).
				Msg("Verification email sent successfully")
		}
	})

	return nil
}

// VerifyEmail verifies the email using the provided token
func (s *VerificationService) VerifyEmail(ctx context.Context, token string) error {
	logger := utils.GetLogger()

	// Hash the token for lookup
	tokenHash := utils.HashToken(token)

	// Get verification token from database
	verificationToken, err := s.verificationRepo.GetByToken(ctx, tokenHash)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return fmt.Errorf(constants.ErrMsgInvalidToken)
		}
		return fmt.Errorf("failed to get verification token: %w", err)
	}

	// Verify it's an email verification token
	if verificationToken.TokenType != constants.TokenTypeEmailVerification {
		return fmt.Errorf("invalid token type")
	}

	// Mark token as used
	if err := s.verificationRepo.MarkAsUsed(ctx, verificationToken.ID); err != nil {
		logger.Warn().Err(err).Msg("Failed to mark token as used")
	}

	// Mark user's email as verified
	if err := s.userRepo.MarkEmailAsVerified(ctx, verificationToken.UserID); err != nil {
		return fmt.Errorf("failed to verify email: %w", err)
	}

	logger.Info().
		Str(constants.LogFieldUserID, verificationToken.UserID.Hex()).
		Str(constants.LogFieldEvent, constants.AuditEventUserEmailVerified).
		Msg("Email verified successfully")

	return nil
}

// ResendVerificationEmail resends the verification email
func (s *VerificationService) ResendVerificationEmail(ctx context.Context, email string) error {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// Don't reveal if user exists (security best practice)
			return nil
		}
		return fmt.Errorf("failed to get user: %w", err)
	}

	if user.EmailVerified {
		return fmt.Errorf(constants.ErrMsgEmailAlreadyVerified)
	}

	return s.SendVerificationEmail(ctx, user.ID)
}

// PasswordResetService handles password reset functionality
type PasswordResetService struct {
	verificationRepo *repositories.VerificationTokenRepository
	userRepo         *repositories.UserRepository
	emailService     *EmailService
}

func NewPasswordResetService(
	verificationRepo *repositories.VerificationTokenRepository,
	userRepo         *repositories.UserRepository,
	emailService     *EmailService,
) *PasswordResetService {
	return &PasswordResetService{
		verificationRepo: verificationRepo,
		userRepo:         userRepo,
		emailService:     emailService,
	}
}

// RequestPasswordReset generates and sends a password reset email
func (s *PasswordResetService) RequestPasswordReset(ctx context.Context, email string) error {
	logger := utils.GetLogger()

	// Get user - use timing-safe lookup to prevent user enumeration
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			// Don't reveal if user exists or not (security best practice)
			logger.Warn().Str(constants.LogFieldEmail, email).Msg("Password reset requested for non-existent user")
			return nil // Return success to prevent user enumeration
		}
		return fmt.Errorf("failed to get user: %w", err)
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
		// User uses OAuth only - don't send reset email
		logger.Warn().Str(constants.LogFieldEmail, email).Msg("Password reset requested for OAuth-only user")
		return nil // Still return success
	}

	// Generate secure random token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}

	token := base64.URLEncoding.EncodeToString(tokenBytes)
	tokenHash := utils.HashToken(token)

	// Create password reset token (expires in 1 hour)
	resetToken := &models.VerificationToken{
		UserID:    user.ID,
		Token:     tokenHash,
		TokenType: constants.TokenTypePasswordReset,
		ExpiresAt: time.Now().Add(constants.PasswordResetExpiry),
		CreatedAt: time.Now(),
	}

	// Store in database
	if err := s.verificationRepo.Create(ctx, resetToken); err != nil {
		return fmt.Errorf("failed to store reset token: %w", err)
	}

	// Send email asynchronously
	utils.ExecuteBackgroundTask(ctx, func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), constants.EmailSendTimeout)
		defer cancel()

		if err := s.emailService.SendPasswordResetEmail(bgCtx, user.Email, user.Name, token); err != nil {
			logger.Error().Err(err).
				Str(constants.LogFieldUserID, user.ID.Hex()).
				Str(constants.LogFieldEmail, user.Email).
				Msg("Failed to send password reset email")
		} else {
			logger.Info().
				Str(constants.LogFieldUserID, user.ID.Hex()).
				Str(constants.LogFieldEmail, user.Email).
				Msg("Password reset email sent successfully")
		}
	})

	return nil
}

// ResetPassword resets the password using the provided token
func (s *PasswordResetService) ResetPassword(ctx context.Context, token, newPassword string) error {
	logger := utils.GetLogger()

	// Validate password complexity
	if validationErrors := utils.ValidatePassword(newPassword); len(validationErrors) > 0 {
		return fmt.Errorf("password validation failed: %s", validationErrors[0])
	}

	// Hash the token for lookup
	tokenHash := utils.HashToken(token)

	// Get reset token from database
	resetToken, err := s.verificationRepo.GetByToken(ctx, tokenHash)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return errors.ErrInvalidToken
		}
		return fmt.Errorf("failed to get reset token: %w", err)
	}

	// Verify it's a password reset token
	if resetToken.TokenType != constants.TokenTypePasswordReset {
		return fmt.Errorf("invalid token type")
	}

	// Mark token as used
	if err := s.verificationRepo.MarkAsUsed(ctx, resetToken.ID); err != nil {
		logger.Warn().Err(err).Msg("Failed to mark reset token as used")
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update user's password
	if err := s.userRepo.UpdatePassword(ctx, resetToken.UserID, hashedPassword); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Revoke all refresh tokens for security (force re-login)
	if err := s.userRepo.RevokeAllRefreshTokens(ctx, resetToken.UserID); err != nil {
		logger.Warn().Err(err).Msg("Failed to revoke refresh tokens")
	}

	// Reset failed login attempts
	if err := s.userRepo.ResetFailedLoginAttempts(ctx, resetToken.UserID); err != nil {
		logger.Warn().Err(err).Msg("Failed to reset failed login attempts")
	}

	logger.Info().
		Str(constants.LogFieldUserID, resetToken.UserID.Hex()).
		Str(constants.LogFieldEvent, constants.AuditEventUserPasswordReset).
		Msg("Password reset successfully")

	return nil
}
