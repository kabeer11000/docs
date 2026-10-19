package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"authentication-service/constants"
	"authentication-service/utils"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

// ConnectRedis initializes the Redis client with connection pooling
func ConnectRedis() error {
	logger := utils.GetLogger()

	redisURL := os.Getenv(constants.EnvRedisURL)
	if redisURL == "" {
		return fmt.Errorf("REDIS_URL environment variable is not set")
	}

	// Parse Redis URL
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	// Configure connection pooling
	opt.PoolSize = constants.RedisPoolSize
	opt.MinIdleConns = constants.RedisMinIdleConns
	opt.ConnMaxIdleTime = constants.RedisConnMaxIdleTime
	opt.ConnMaxLifetime = constants.RedisConnMaxLifetime
	opt.DialTimeout = constants.RedisDialTimeout
	opt.ReadTimeout = constants.RedisReadTimeout
	opt.WriteTimeout = constants.RedisWriteTimeout

	// Create Redis client
	RedisClient = redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := RedisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to ping Redis: %w", err)
	}

	logger.Info().
		Int("pool_size", constants.RedisPoolSize).
		Int("min_idle", constants.RedisMinIdleConns).
		Msg("Connected to Redis successfully")

	return nil
}

// DisconnectRedis closes the Redis connection
func DisconnectRedis() error {
	if RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Close the Redis connection
	if err := RedisClient.Shutdown(ctx).Err(); err != nil {
		return fmt.Errorf("failed to shutdown Redis: %w", err)
	}

	return nil
}

// GetRedisClient returns the Redis client instance
func GetRedisClient() *redis.Client {
	return RedisClient
}
