package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"authentication-service/database"
	"authentication-service/handlers"
	"authentication-service/repositories"
	"authentication-service/routes"
	"authentication-service/services"
	"authentication-service/utils"

	"github.com/joho/godotenv"
	"golang.org/x/sync/errgroup"
)

func main() {
	// Initialize structured logger first
	utils.InitLogger()
	logger := utils.GetLogger()

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		logger.Warn().Msg(".env file not found, using system environment variables")
	}

	// Initialize JWT
	if err := utils.InitJWT(); err != nil {
		logger.Warn().Err(err).Msg("Failed to initialize JWT - make sure keys are properly configured")
	}

	// Connect to MongoDB
	if err := database.Connect(); err != nil {
		logger.Fatal().Err(err).Msg("Failed to connect to MongoDB")
	}
	defer database.Disconnect()

	// Connect to Redis
	if err := database.ConnectRedis(); err != nil {
		logger.Fatal().Err(err).Msg("Failed to connect to Redis")
	}
	defer database.DisconnectRedis()

	// Create context for initialization
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Initialize repositories
	userRepo := repositories.NewUserRepository()
	stateRepo := repositories.NewStateRepository()
	webauthnSessionRepo := repositories.NewWebAuthnSessionRepository()
	verificationTokenRepo := repositories.NewVerificationTokenRepository()

	// Create indexes in parallel using errgroup
	logger.Info().Msg("Creating database indexes...")
	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		if err := userRepo.CreateIndexes(gctx); err != nil {
			logger.Warn().Err(err).Msg("Failed to create user indexes")
			return err
		}
		logger.Info().Msg("✓ User indexes created")
		return nil
	})

	g.Go(func() error {
		if err := stateRepo.CreateIndexes(gctx); err != nil {
			logger.Warn().Err(err).Msg("Failed to create state indexes")
			return err
		}
		logger.Info().Msg("✓ State indexes created")
		return nil
	})

	g.Go(func() error {
		if err := webauthnSessionRepo.CreateIndexes(gctx); err != nil {
			logger.Warn().Err(err).Msg("Failed to create webauthn session indexes")
			return err
		}
		logger.Info().Msg("✓ WebAuthn session indexes created")
		return nil
	})

	g.Go(func() error {
		if err := verificationTokenRepo.CreateIndexes(gctx); err != nil {
			logger.Warn().Err(err).Msg("Failed to create verification token indexes")
			return err
		}
		logger.Info().Msg("✓ Verification token indexes created")
		return nil
	})

	// Wait for all indexes to be created
	if err := g.Wait(); err != nil {
		logger.Warn().Err(err).Msg("Some indexes failed to create")
	} else {
		logger.Info().Msg("All database indexes created successfully")
	}

	// Initialize services
	authService := services.NewAuthService(userRepo)
	googleService := services.NewGoogleOAuthService(userRepo, stateRepo)

	webauthnService, err := services.NewWebAuthnService(userRepo, webauthnSessionRepo)
	if err != nil {
		logger.Warn().Err(err).Msg("Failed to initialize WebAuthn service")
	}

	// Initialize email and verification services
	emailService := services.NewEmailService()
	verificationService := services.NewVerificationService(verificationTokenRepo, userRepo, emailService)
	passwordResetService := services.NewPasswordResetService(verificationTokenRepo, userRepo, emailService)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	googleHandler := handlers.NewGoogleOAuthHandler(googleService)
	webauthnHandler := handlers.NewWebAuthnHandler(webauthnService)
	verificationHandler := handlers.NewVerificationHandler(verificationService, passwordResetService)

	// Setup routes
	router := routes.SetupRoutes(authHandler, googleHandler, webauthnHandler, verificationHandler)

	// Get server configuration
	// Render uses PORT env var, fall back to SERVER_PORT for local development
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("SERVER_PORT")
	}
	if port == "" {
		port = "8081"
	}

	// Always bind to 0.0.0.0 in production, only use SERVER_HOST for local dev
	host := "0.0.0.0"
	if localHost := os.Getenv("SERVER_HOST"); localHost != "" && localHost != "localhost" {
		host = localHost
	}

	address := host + ":" + port

	// Create HTTP server with timeouts
	srv := &http.Server{
		Addr:           address,
		Handler:        router,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   15 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	// Start server in a goroutine
	logger.Info().Str("address", address).Msg("Starting authentication service")

	serverErrors := make(chan error, 1)
	go func() {
		serverErrors <- srv.ListenAndServe()
	}()

	// Setup graceful shutdown
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	// Block until we receive a shutdown signal or server error
	select {
	case err := <-serverErrors:
		if err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("Server error")
		}

	case sig := <-shutdown:
		logger.Info().Str("signal", sig.String()).Msg("Received shutdown signal - starting graceful shutdown")

		// Create context with timeout for graceful shutdown
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer shutdownCancel()

		// Attempt graceful shutdown
		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Error().Err(err).Msg("Error during shutdown")

			// Force close if graceful shutdown fails
			if closeErr := srv.Close(); closeErr != nil {
				logger.Error().Err(closeErr).Msg("Error forcing server close")
			}
		}

		logger.Info().Msg("Server stopped gracefully")
	}
}
