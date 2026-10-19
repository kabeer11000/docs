package middleware

import (
	"context"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimiter struct {
	requests map[string][]time.Time
	mutex    sync.RWMutex
	limit    int
	window   time.Duration
	ctx      context.Context
	cancel   context.CancelFunc
}

var (
	limiter     *rateLimiter
	limiterOnce sync.Once
)

// InitRateLimiter initializes the rate limiter with a context for graceful shutdown
func InitRateLimiter(ctx context.Context) {
	limiterOnce.Do(func() {
		limit := 60 // Default: 60 requests per minute
		if limitStr := os.Getenv("RATE_LIMIT_REQUESTS_PER_MINUTE"); limitStr != "" {
			if l, err := strconv.Atoi(limitStr); err == nil {
				limit = l
			}
		}

		limiterCtx, cancel := context.WithCancel(ctx)

		limiter = &rateLimiter{
			requests: make(map[string][]time.Time),
			limit:    limit,
			window:   time.Minute,
			ctx:      limiterCtx,
			cancel:   cancel,
		}

		// Start cleanup goroutine with context for graceful shutdown
		go limiter.cleanup()
	})
}

// Shutdown gracefully stops the rate limiter
func ShutdownRateLimiter() {
	if limiter != nil {
		limiter.cancel()
	}
}

func RateLimitMiddleware() gin.HandlerFunc {
	// Initialize with background context if not already initialized
	if limiter == nil {
		InitRateLimiter(context.Background())
	}

	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		if !limiter.allow(clientIP) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	// Get or create request times for this key
	if rl.requests[key] == nil {
		rl.requests[key] = []time.Time{}
	}

	// Remove old requests outside the window
	validRequests := make([]time.Time, 0, len(rl.requests[key]))
	for _, reqTime := range rl.requests[key] {
		if reqTime.After(windowStart) {
			validRequests = append(validRequests, reqTime)
		}
	}
	rl.requests[key] = validRequests

	// Check if limit exceeded
	if len(rl.requests[key]) >= rl.limit {
		return false
	}

	// Add current request
	rl.requests[key] = append(rl.requests[key], now)
	return true
}

func (rl *rateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			rl.mutex.Lock()
			now := time.Now()
			windowStart := now.Add(-rl.window * 2) // Keep extra buffer

			// Clean up old entries
			for key, requests := range rl.requests {
				validRequests := make([]time.Time, 0, len(requests))
				for _, reqTime := range requests {
					if reqTime.After(windowStart) {
						validRequests = append(validRequests, reqTime)
					}
				}

				if len(validRequests) == 0 {
					delete(rl.requests, key)
				} else {
					rl.requests[key] = validRequests
				}
			}
			rl.mutex.Unlock()

		case <-rl.ctx.Done():
			// Graceful shutdown
			return
		}
	}
}
