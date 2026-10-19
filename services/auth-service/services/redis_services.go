package services

import (
	"context"
	"fmt"
	"time"

	"authentication-service/constants"
	"authentication-service/database"
	"authentication-service/utils"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RateLimiterService handles distributed rate limiting using Redis
type RateLimiterService struct {
	redis *redis.Client
}

func NewRateLimiterService() *RateLimiterService {
	return &RateLimiterService{
		redis: database.GetRedisClient(),
	}
}

// Allow checks if a request is allowed based on rate limiting
func (s *RateLimiterService) Allow(ctx context.Context, key string, limit int, window time.Duration) (bool, error) {
	logger := utils.GetLogger()

	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixRateLimit, key)

	// Use sliding window algorithm with Redis
	pipe := s.redis.Pipeline()

	// Increment counter
	incr := pipe.Incr(ctx, redisKey)

	// Set expiration if this is the first request in the window
	pipe.Expire(ctx, redisKey, window)

	// Execute pipeline
	if _, err := pipe.Exec(ctx); err != nil {
		logger.Error().Err(err).Str("key", key).Msg("Failed to execute rate limit pipeline")
		// Fail open - allow the request if Redis is down
		return true, nil
	}

	count := incr.Val()

	if count > int64(limit) {
		logger.Warn().
			Str("key", key).
			Int64("count", count).
			Int("limit", limit).
			Msg("Rate limit exceeded")
		return false, nil
	}

	return true, nil
}

// Reset resets the rate limit for a key
func (s *RateLimiterService) Reset(ctx context.Context, key string) error {
	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixRateLimit, key)
	return s.redis.Del(ctx, redisKey).Err()
}

// TokenBlacklistService handles token blacklisting using Redis
type TokenBlacklistService struct {
	redis *redis.Client
}

func NewTokenBlacklistService() *TokenBlacklistService {
	return &TokenBlacklistService{
		redis: database.GetRedisClient(),
	}
}

// BlacklistToken adds a token to the blacklist
func (s *TokenBlacklistService) BlacklistToken(ctx context.Context, tokenID string, expiresAt time.Time) error {
	logger := utils.GetLogger()

	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixTokenBlacklist, tokenID)

	// Calculate TTL (time until token expires)
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		// Token already expired, no need to blacklist
		return nil
	}

	// Add to blacklist with TTL
	if err := s.redis.Set(ctx, redisKey, "1", ttl).Err(); err != nil {
		logger.Error().Err(err).Str("token_id", tokenID).Msg("Failed to blacklist token")
		return fmt.Errorf("failed to blacklist token: %w", err)
	}

	logger.Info().
		Str("token_id", tokenID).
		Dur("ttl", ttl).
		Str(constants.LogFieldEvent, constants.AuditEventTokenBlacklisted).
		Msg("Token blacklisted successfully")

	return nil
}

// IsTokenBlacklisted checks if a token is blacklisted
func (s *TokenBlacklistService) IsTokenBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixTokenBlacklist, tokenID)

	exists, err := s.redis.Exists(ctx, redisKey).Result()
	if err != nil {
		// Fail open - allow the token if Redis is down
		utils.GetLogger().Error().Err(err).Str("token_id", tokenID).Msg("Failed to check token blacklist")
		return false, nil
	}

	return exists > 0, nil
}

// RemoveFromBlacklist removes a token from the blacklist
func (s *TokenBlacklistService) RemoveFromBlacklist(ctx context.Context, tokenID string) error {
	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixTokenBlacklist, tokenID)
	return s.redis.Del(ctx, redisKey).Err()
}

// AccountLockoutService handles distributed account lockout using Redis
type AccountLockoutService struct {
	redis *redis.Client
}

func NewAccountLockoutService() *AccountLockoutService {
	return &AccountLockoutService{
		redis: database.GetRedisClient(),
	}
}

// IncrementFailedAttempts increments the failed login attempt counter
func (s *AccountLockoutService) IncrementFailedAttempts(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	logger := utils.GetLogger()

	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixAccountLockout, userID.Hex())

	pipe := s.redis.Pipeline()

	// Increment counter
	incr := pipe.Incr(ctx, redisKey)

	// Set expiration (15 minutes - same as lockout duration)
	pipe.Expire(ctx, redisKey, constants.AccountLockoutDuration)

	// Execute pipeline
	if _, err := pipe.Exec(ctx); err != nil {
		logger.Error().Err(err).Str(constants.LogFieldUserID, userID.Hex()).Msg("Failed to increment failed attempts")
		return 0, fmt.Errorf("failed to increment failed attempts: %w", err)
	}

	count := incr.Val()

	logger.Info().
		Str(constants.LogFieldUserID, userID.Hex()).
		Int64("attempts", count).
		Str(constants.LogFieldEvent, constants.AuditEventUserFailedLogin).
		Msg("Failed login attempt recorded")

	return count, nil
}

// GetFailedAttempts gets the number of failed login attempts
func (s *AccountLockoutService) GetFailedAttempts(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixAccountLockout, userID.Hex())

	count, err := s.redis.Get(ctx, redisKey).Int64()
	if err != nil {
		if err == redis.Nil {
			return 0, nil // No failed attempts
		}
		return 0, err
	}

	return count, nil
}

// IsAccountLocked checks if an account is locked
func (s *AccountLockoutService) IsAccountLocked(ctx context.Context, userID primitive.ObjectID) (bool, error) {
	count, err := s.GetFailedAttempts(ctx, userID)
	if err != nil {
		// Fail open - don't lock account if Redis is down
		return false, nil
	}

	return count >= constants.MaxFailedLoginAttempts, nil
}

// LockAccount explicitly locks an account
func (s *AccountLockoutService) LockAccount(ctx context.Context, userID primitive.ObjectID, duration time.Duration) error {
	logger := utils.GetLogger()

	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixAccountLockout, userID.Hex())

	// Set to max failed attempts to trigger lockout
	if err := s.redis.Set(ctx, redisKey, constants.MaxFailedLoginAttempts, duration).Err(); err != nil {
		logger.Error().Err(err).Str(constants.LogFieldUserID, userID.Hex()).Msg("Failed to lock account")
		return fmt.Errorf("failed to lock account: %w", err)
	}

	logger.Warn().
		Str(constants.LogFieldUserID, userID.Hex()).
		Dur("duration", duration).
		Str(constants.LogFieldEvent, constants.AuditEventUserAccountLocked).
		Msg("Account locked")

	return nil
}

// ResetFailedAttempts resets the failed login attempt counter
func (s *AccountLockoutService) ResetFailedAttempts(ctx context.Context, userID primitive.ObjectID) error {
	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixAccountLockout, userID.Hex())
	return s.redis.Del(ctx, redisKey).Err()
}

// GetTimeUntilUnlock gets the time until an account is unlocked
func (s *AccountLockoutService) GetTimeUntilUnlock(ctx context.Context, userID primitive.ObjectID) (time.Duration, error) {
	redisKey := fmt.Sprintf("%s%s", constants.RedisKeyPrefixAccountLockout, userID.Hex())

	ttl, err := s.redis.TTL(ctx, redisKey).Result()
	if err != nil {
		return 0, err
	}

	if ttl < 0 {
		return 0, nil // Key doesn't exist or has no expiration
	}

	return ttl, nil
}
