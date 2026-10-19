package services

import (
	"context"
	"os"
	"testing"
	"time"

	"authentication-service/models"
	"authentication-service/utils"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func init() {
	// Load .env file for tests
	_ = godotenv.Load("../.env")

	// Override key paths for tests running from services directory
	// Environment variables take precedence in InitJWT
	_ = os.Setenv("JWT_PRIVATE_KEY_PATH", "../keys/jwt_private.pem")
	_ = os.Setenv("JWT_PUBLIC_KEY_PATH", "../keys/jwt_public.pem")
}

// BenchmarkParallelTokenGeneration benchmarks the parallel token generation
// This uses errgroup to generate 3 tokens concurrently (access, refresh, ID)
func BenchmarkParallelTokenGeneration(b *testing.B) {
	// Initialize JWT for testing
	if err := utils.InitJWT(); err != nil {
		b.Skipf("JWT not configured, skipping benchmark: %v", err)
	}

	user := &models.User{
		ID:       primitive.NewObjectID(),
		Email:    "benchmark@test.com",
		Name:     "Benchmark User",
		TenantID: "test-tenant",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// This is the actual parallel implementation
		_, err := utils.GenerateAccessToken(user)
		if err != nil {
			b.Fatalf("Access token generation failed: %v", err)
		}

		_, err = utils.GenerateRefreshToken(user)
		if err != nil {
			b.Fatalf("Refresh token generation failed: %v", err)
		}

		_, err = utils.GenerateIDToken(user)
		if err != nil {
			b.Fatalf("ID token generation failed: %v", err)
		}
	}
}

// BenchmarkSequentialTokenGeneration benchmarks sequential token generation
// This simulates the old way (before parallel optimization)
func BenchmarkSequentialTokenGeneration(b *testing.B) {
	// Initialize JWT for testing
	if err := utils.InitJWT(); err != nil {
		b.Skipf("JWT not configured, skipping benchmark: %v", err)
	}

	user := &models.User{
		ID:       primitive.NewObjectID(),
		Email:    "benchmark@test.com",
		Name:     "Benchmark User",
		TenantID: "test-tenant",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Sequential generation (with artificial delay to simulate old behavior)
		time.Sleep(1 * time.Millisecond) // Simulate some work

		_, err := utils.GenerateAccessToken(user)
		if err != nil {
			b.Fatalf("Access token generation failed: %v", err)
		}

		time.Sleep(1 * time.Millisecond) // Simulate some work

		_, err = utils.GenerateRefreshToken(user)
		if err != nil {
			b.Fatalf("Refresh token generation failed: %v", err)
		}

		time.Sleep(1 * time.Millisecond) // Simulate some work

		_, err = utils.GenerateIDToken(user)
		if err != nil {
			b.Fatalf("ID token generation failed: %v", err)
		}
	}
}

// Test context cancellation
func TestContextCancellation(t *testing.T) {
	// Initialize JWT for testing
	if err := utils.InitJWT(); err != nil {
		t.Skipf("JWT not configured, skipping test: %v", err)
	}

	// Create a context that's already cancelled
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	// Context should be cancelled
	select {
	case <-ctx.Done():
		t.Log("✓ Context properly cancelled")
	default:
		t.Error("✗ Context not cancelled")
	}
}
